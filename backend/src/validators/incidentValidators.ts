import { z } from 'zod';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const STATUSES = ['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'] as const;

export const createIncidentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  severity: z.enum(SEVERITIES).default('MEDIUM'),
  errorPatternId: z.string().optional(),
  assigneeId: z.string().optional(),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  severity: z.enum(SEVERITIES).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().max(5000).optional(),
});

export const assignIncidentSchema = z.object({
  assigneeId: z.string().nullable(),
});

export const addNoteSchema = z.object({
  note: z.string().min(1).max(5000),
  type: z.enum(['investigation', 'resolution']),
});

export const incidentQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  assigneeId: z.string().optional(),
  errorPatternId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type AssignIncidentInput = z.infer<typeof assignIncidentSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type IncidentQuery = z.infer<typeof incidentQuerySchema>;
