import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

/** Reliable HTTP request logging (works with Express 5 + tsx on Windows). */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const length = res.getHeader('content-length') ?? '-';
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${length} - ${ms}ms`;

    if (env.isProduction) {
      console.log(line);
    } else {
      process.stderr.write(`${line}\n`);
    }
  });

  next();
}
