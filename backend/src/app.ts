import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { errorHandler, loadRoutes } from './utils/index.js';
import {
  auditLogger,
  requestLogger,
  authLimiter,
  globalLimiter,
} from './middleware/index.js';

const app = express();
const routesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'routes');

// Behind Render's proxy — required for express-rate-limit to key on the real
// client IP (X-Forwarded-For) rather than the proxy's.
app.set('trust proxy', 1);

app.use(helmet());
app.use(requestLogger);
app.use(auditLogger);
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Strict throttling on credential-guessing surfaces; looser global ceiling.
app.use(globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/set-password', authLimiter);

await loadRoutes(app, routesDir);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

export default app;
