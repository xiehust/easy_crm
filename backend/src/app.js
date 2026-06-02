import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { getConfig } from './config.js';
import { requireAuth } from './auth.js';
import { errorHandler, notFound } from './errors.js';
import apiRouter from './routes.js';

export function createApp(config = getConfig()) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('combined'));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api', requireAuth(config), apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
