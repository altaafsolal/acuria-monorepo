import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

// helmet's package exports the middleware factory as its CommonJS `module.exports`
// with no `__esModule` marker. Under NodeNext some toolchains (e.g. Vercel's build)
// resolve the default import to the module namespace instead of the callable,
// producing "This expression is not callable". Loading it via createRequire yields
// the real callable factory deterministically.
const require = createRequire(import.meta.url);
const helmet = require('helmet') as (options?: Record<string, unknown>) => express.RequestHandler;
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
