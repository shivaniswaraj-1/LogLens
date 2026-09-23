import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { getDashboardSummary } from '../services/dashboardService';

const querySchema = z.object({
  hours: z.coerce.number().int().min(1).max(24 * 30).default(24),
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const { hours } = querySchema.parse(req.query);
  const result = await getDashboardSummary(hours);
  res.status(200).json(result);
});
