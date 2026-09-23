import { z } from 'zod';

export const errorPatternQuerySchema = z.object({
  service: z.string().optional(),
  sort: z.enum(['frequent', 'recent']).default('frequent'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

export type ErrorPatternQuery = z.infer<typeof errorPatternQuerySchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
