import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getErrorPatternById,
  listErrorPatterns,
  listLogsForPattern,
} from '../services/errorPatternService';
import { errorPatternQuerySchema, paginationSchema } from '../validators/errorPatternValidators';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = errorPatternQuerySchema.parse(req.query);
  const result = await listErrorPatterns(query);
  res.status(200).json(result);
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  const pattern = await getErrorPatternById(req.params.id);
  res.status(200).json({ errorPattern: pattern });
});

export const logsForPattern = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize } = paginationSchema.parse(req.query);
  const result = await listLogsForPattern(req.params.id, page, pageSize);
  res.status(200).json(result);
});
