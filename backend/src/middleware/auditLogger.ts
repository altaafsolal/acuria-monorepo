import type { NextFunction, Request, Response } from 'express';
import { auditLogsRepo } from '../services/baserow/index.js';
import type { CreateAuditLogInput } from '../types/domain.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEYS = new Set([
  'password', 'password_hash', 'accessToken', 'refreshToken', 'token', 'database_token',
]);

/** @internal exported for testing */
export function sanitizeBody(body: unknown): string | null {
  if (body === undefined || body === null) return null;
  if (typeof body !== 'object') return String(body);
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    redacted[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : value;
  }
  try { return JSON.stringify(redacted); } catch { return null; }
}

/** @internal exported for testing */
export function deriveAuditMeta(method: string, path: string): {
  entityType: string; entityId: string | null; action: string;
} {
  const cleanPath = path.split('?')[0] ?? path;
  const parts = cleanPath.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const entityType = parts[0] || 'unknown';
  const reserved = new Set([
    'notes', 'tasks', 'relations', 'kyc-documents', 'users', 'clients',
    'archive', 'der', 'ldm', 'fcc', 'send', 'preview', 'tenants',
  ]);
  const entityId = parts.find((part, index) => index > 0 && !reserved.has(part)) ?? null;
  const verbMap: Record<string, string> = { POST: 'add', PUT: 'edit', PATCH: 'edit', DELETE: 'delete' };
  const verb = verbMap[method] || method.toLowerCase();
  return { entityType, entityId, action: `${verb}.${entityType}` };
}

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
    const { entityType, entityId, action } = deriveAuditMeta(req.method, req.originalUrl);
    const input: CreateAuditLogInput = {
      user_id: req.user!.id,
      user_email: req.user!.email,
      user_name: req.user!.name,
      user_role: req.user!.role,
      tenant_id: req.user!.tenantId,
      action,
      method: req.method,
      path: req.originalUrl.split('?')[0] ?? req.originalUrl,
      status_code: res.statusCode,
      entity_type: entityType,
      entity_id: entityId,
      details: sanitizeBody(req.body),
    };
    void auditLogsRepo.createAuditLog(input).catch((error) => {
      console.error('Audit log write failed:', error instanceof Error ? error.message : error);
    });
  });
  next();
}
