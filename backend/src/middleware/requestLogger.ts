import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

/** Reliable HTTP request logging (works with Express 5 + tsx on Windows). */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const length = res.getHeader('content-length') ?? '-';
    // Strip the query string — it can carry tokens (e.g. ?token= on the WS
    // upgrade) that must never land in logs.
    const path = req.originalUrl.split('?')[0] ?? req.originalUrl;
    const line = `${req.method} ${path} ${res.statusCode} ${length} - ${ms}ms`;

    if (env.isProduction) {
      console.log(line);
    } else {
      process.stderr.write(`${line}\n`);
    }
  });

  next();
}
