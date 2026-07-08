import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { errorHandler, loadRoutes } from './utils/index.js';
import { auditLogger, requestLogger } from './middleware/index.js';

const app = express();
// ROUTES_DIR is set in vercel.json — Vercel bundles app.js so import.meta.url
// points to the bundle, not the compiled file. Falls back to local dev behaviour.
const routesDir = process.env.ROUTES_DIR
  ? path.join(process.cwd(), process.env.ROUTES_DIR)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), 'routes');

app.use(requestLogger);
app.use(auditLogger);
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

await loadRoutes(app, routesDir);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

export default app;
