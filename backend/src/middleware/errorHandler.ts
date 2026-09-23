import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { message: 'Route not found' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: { message: err.message, details: err.details } });
    return;
  }

  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file exceeds the maximum allowed size' : err.message;
    res.status(400).json({ error: { message } });
    return;
  }

  if (err instanceof Error && err.message === 'Only .log or .txt files are allowed') {
    res.status(400).json({ error: { message: err.message } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: { message: 'A record with this value already exists' } });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { message: 'Record not found' } });
      return;
    }
    if (err.code === 'P2003') {
      const field = (err.meta?.field_name as string | undefined) ?? 'reference';
      res.status(400).json({ error: { message: `Invalid ${field}: referenced record does not exist` } });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
}
