import { z } from 'zod';
import { LOG_LEVELS } from '../types/log';

export const pasteLogsSchema = z.object({
  content: z.string().min(1, 'content must not be empty'),
  filename: z.string().max(255).optional(),
});

export const logQuerySchema = z.object({
  service: z.string().optional(),
  level: z.enum(LOG_LEVELS).optional(),
  requestId: z.string().optional(),
  traceId: z.string().optional(),
  errorPatternId: z.string().optional(),
  search: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type LogQuery = z.infer<typeof logQuerySchema>;
