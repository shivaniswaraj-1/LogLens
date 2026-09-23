import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ingestLogText } from '../services/logIngestionService';
import { getLogById, listDistinctServices, listLogs } from '../services/logService';
import { logQuerySchema, pasteLogsSchema } from '../validators/logValidators';

export const ingest = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (req.file) {
    const content = req.file.buffer.toString('utf-8');
    if (content.trim().length === 0) {
      throw ApiError.badRequest('Uploaded file is empty');
    }
    const summary = await ingestLogText(content, {
      source: 'FILE',
      filename: req.file.originalname,
      userId,
    });
    res.status(201).json(summary);
    return;
  }

  const input = pasteLogsSchema.parse(req.body);
  const summary = await ingestLogText(input.content, {
    source: 'PASTE',
    filename: input.filename,
    userId,
  });
  res.status(201).json(summary);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = logQuerySchema.parse(req.query);
  const result = await listLogs(query);
  res.status(200).json(result);
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  const log = await getLogById(req.params.id);
  res.status(200).json({ log });
});

export const services = asyncHandler(async (_req: Request, res: Response) => {
  const list = await listDistinctServices();
  res.status(200).json({ services: list });
});
