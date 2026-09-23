import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import logRoutes from './routes/logRoutes';
import errorPatternRoutes from './routes/errorPatternRoutes';
import incidentRoutes from './routes/incidentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import userRoutes from './routes/userRoutes';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  // Paste-ingestion sends log text as a JSON body, so the JSON body limit
  // must track MAX_UPLOAD_SIZE_BYTES (the same ceiling multer enforces for
  // file uploads) plus a small margin for JSON string-escaping overhead —
  // otherwise the two ingestion paths silently enforce different limits.
  app.use(express.json({ limit: env.maxUploadSizeBytes + 1024 * 1024 }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/logs', logRoutes);
  app.use('/api/error-patterns', errorPatternRoutes);
  app.use('/api/incidents', incidentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/users', userRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
