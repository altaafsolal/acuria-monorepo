import type { NextFunction, Request, Response } from 'express';
import { auditService } from '../services/index.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function shouldAudit(req: Request): boolean {
  if (!MUTATION_METHODS.has(req.method)) return false;
  const path = req.originalUrl.split('?')[0] ?? req.originalUrl;
  if (path.startsWith('/api/health')) return false;
  if (path.startsWith('/api/auth')) return false;
  return Boolean(req.user);
}

export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    if (!shouldAudit(req)) return;
    void auditService.recordFromRequest(req, res).catch((error) => {
      console.error('Audit log write failed:', error instanceof Error ? error.message : error);
    });
  });
  next();
}
