import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { LogQuery } from '../validators/logValidators';

export async function listLogs(query: LogQuery) {
  const where: Prisma.LogWhereInput = {};

  if (query.service) where.service = query.service;
  if (query.level) where.level = query.level;
  if (query.requestId) where.requestId = query.requestId;
  if (query.traceId) where.traceId = query.traceId;
  if (query.errorPatternId) where.errorPatternId = query.errorPatternId;
  if (query.search) where.message = { contains: query.search, mode: 'insensitive' };
  if (query.from || query.to) {
    where.timestamp = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }

  const [total, items] = await prisma.$transaction([
    prisma.log.count({ where }),
    prisma.log.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
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

export async function getLogById(id: string) {
  const log = await prisma.log.findUnique({
    where: { id },
    include: { errorPattern: true, uploadBatch: true },
  });
  if (!log) throw ApiError.notFound('Log not found');
  return log;
}

export async function listDistinctServices(): Promise<string[]> {
  const rows = await prisma.log.findMany({
    distinct: ['service'],
    select: { service: true },
    orderBy: { service: 'asc' },
  });
  return rows.map((r) => r.service);
}
