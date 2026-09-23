import { IncidentEventType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import {
  AddNoteInput,
  AssignIncidentInput,
  CreateIncidentInput,
  IncidentQuery,
  UpdateIncidentInput,
  UpdateStatusInput,
} from '../validators/incidentValidators';

const incidentInclude = {
  errorPattern: true,
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.IncidentInclude;

async function recordEvent(
  tx: Prisma.TransactionClient,
  incidentId: string,
  type: IncidentEventType,
  message: string,
  actorId?: string,
) {
  await tx.incidentEvent.create({ data: { incidentId, type, message, actorId } });
}

export async function createIncident(input: CreateIncidentInput, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incident.create({
      data: {
        title: input.title,
        description: input.description,
        severity: input.severity,
        errorPatternId: input.errorPatternId,
        assigneeId: input.assigneeId,
        createdById,
      },
      include: incidentInclude,
    });

    await recordEvent(tx, incident.id, 'CREATED', `Incident created with severity ${incident.severity}`, createdById);
    if (input.assigneeId) {
      await recordEvent(tx, incident.id, 'ASSIGNED', `Assigned to ${incident.assignee?.name ?? input.assigneeId}`, createdById);
    }

    return incident;
  });
}

export async function listIncidents(query: IncidentQuery) {
  const where: Prisma.IncidentWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.severity) where.severity = query.severity;
  if (query.assigneeId) where.assigneeId = query.assigneeId;
  if (query.errorPatternId) where.errorPatternId = query.errorPatternId;

  const [total, items] = await prisma.$transaction([
    prisma.incident.count({ where }),
    prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: incidentInclude,
    }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export async function getIncidentById(id: string) {
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: { ...incidentInclude, events: { orderBy: { createdAt: 'asc' }, include: { actor: { select: { id: true, name: true } } } } },
  });
  if (!incident) throw ApiError.notFound('Incident not found');
  return incident;
}

export async function updateIncident(id: string, input: UpdateIncidentInput, actorId: string) {
  // No separate existence pre-check: tx.incident.update() already throws
  // P2025 (mapped to 404 in errorHandler) when the row doesn't exist, so a
  // prior findUnique would just be a redundant round-trip.
  return prisma.$transaction(async (tx) => {
    const updated = await tx.incident.update({ where: { id }, data: input, include: incidentInclude });
    if (input.severity) {
      await recordEvent(tx, id, 'SEVERITY_CHANGED', `Severity changed to ${input.severity}`, actorId);
    }
    return updated;
  });
}

export async function updateIncidentStatus(id: string, input: UpdateStatusInput, actorId: string) {
  // The "current status" read and the update happen inside the same
  // transaction so the STATUS_CHANGED event's "from" value can't go stale
  // between a pre-check and the write if two requests race on one incident.
  return prisma.$transaction(async (tx) => {
    const existing = await tx.incident.findUniqueOrThrow({ where: { id } });
    if (existing.status === input.status) {
      throw ApiError.badRequest(`Incident is already ${input.status}`);
    }

    const updated = await tx.incident.update({
      where: { id },
      data: { status: input.status },
      include: incidentInclude,
    });
    await recordEvent(
      tx,
      id,
      'STATUS_CHANGED',
      `Status changed from ${existing.status} to ${input.status}`,
      actorId,
    );
    if (input.note) {
      await recordEvent(tx, id, 'NOTE_ADDED', input.note, actorId);
    }
    return updated;
  });
}

export async function assignIncident(id: string, input: AssignIncidentInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.incident.update({
      where: { id },
      data: { assigneeId: input.assigneeId },
      include: incidentInclude,
    });
    const eventType: IncidentEventType = input.assigneeId ? 'ASSIGNED' : 'UNASSIGNED';
    const message = input.assigneeId
      ? `Assigned to ${updated.assignee?.name ?? input.assigneeId}`
      : 'Unassigned';
    await recordEvent(tx, id, eventType, message, actorId);
    return updated;
  });
}

export async function addIncidentNote(id: string, input: AddNoteInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.incident.findUniqueOrThrow({ where: { id } });
    const isInvestigation = input.type === 'investigation';
    const previous = isInvestigation ? existing.investigationNotes : existing.resolutionNotes;
    const appended = previous ? `${previous}\n\n${input.note}` : input.note;

    const updated = await tx.incident.update({
      where: { id },
      data: isInvestigation ? { investigationNotes: appended } : { resolutionNotes: appended },
      include: incidentInclude,
    });
    await recordEvent(tx, id, 'NOTE_ADDED', `${input.type} note added: ${input.note}`, actorId);
    return updated;
  });
}

export async function listIncidentEvents(id: string) {
  await prisma.incident.findUniqueOrThrow({ where: { id } });
  return prisma.incidentEvent.findMany({
    where: { incidentId: id },
    orderBy: { createdAt: 'asc' },
    include: { actor: { select: { id: true, name: true } } },
  });
}
