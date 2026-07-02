import type { Request, Response } from 'express';
import { auditLogsRepo } from './baserow/index.js';
import type {
  AuditListParams,
  AuditListResult,
  AuthUser,
  CreateAuditLogInput,
  DbUser,
} from '../types/domain.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'accessToken',
  'refreshToken',
  'token',
  'database_token',
]);

function sanitizeBody(body: unknown): string | null {
  if (body === undefined || body === null) return null;
  if (typeof body !== 'object') return String(body);

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }

  try {
    return JSON.stringify(redacted);
  } catch {
    return null;
  }
}

function deriveAuditMeta(method: string, path: string): {
  entityType: string;
  entityId: string | null;
  action: string;
} {
  const cleanPath = path.split('?')[0] ?? path;
  const parts = cleanPath.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const entityType = parts[0] || 'unknown';
  const reserved = new Set([
    'notes', 'tasks', 'relations', 'kyc-documents', 'users', 'clients',
    'archive', 'der', 'ldm', 'fcc', 'send', 'preview', 'tenants',
  ]);
  const entityId = parts.find((part, index) => index > 0 && !reserved.has(part)) ?? null;
  const verbMap: Record<string, string> = {
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };
  const verb = verbMap[method] || method.toLowerCase();
  return {
    entityType,
    entityId,
    action: `${verb}.${entityType}`,
  };
}

function shouldSkipPath(path: string): boolean {
  const clean = path.split('?')[0] ?? path;
  return clean.startsWith('/api/health') || clean.startsWith('/api/auth');
}

export async function recordFromRequest(req: Request, res: Response): Promise<void> {
  if (!MUTATION_METHODS.has(req.method)) return;
  if (shouldSkipPath(req.originalUrl)) return;
  if (!req.user) return;

  const { entityType, entityId, action } = deriveAuditMeta(req.method, req.originalUrl);
  const input: CreateAuditLogInput = {
    user_id: req.user.id,
    user_email: req.user.email,
    user_name: req.user.name,
    user_role: req.user.role,
    tenant_id: req.user.tenantId,
    action,
    method: req.method,
    path: req.originalUrl.split('?')[0] ?? req.originalUrl,
    status_code: res.statusCode,
    entity_type: entityType,
    entity_id: entityId,
    details: sanitizeBody(req.body),
  };

  await auditLogsRepo.createAuditLog(input);
}

export async function recordAuthEvent(
  user: Pick<DbUser, 'id' | 'email' | 'name' | 'role' | 'tenant_id'> | AuthUser | null,
  action: string,
  req: Request,
  res: Response,
): Promise<void> {
  const path = req.originalUrl.split('?')[0] ?? req.originalUrl;
  const tenantId = user && 'tenant_id' in user
    ? user.tenant_id
    : user?.tenantId ?? null;

  await auditLogsRepo.createAuditLog({
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
    user_name: user?.name ?? null,
    user_role: user?.role ?? null,
    tenant_id: tenantId,
    action,
    method: req.method,
    path,
    status_code: res.statusCode,
    entity_type: 'auth',
    entity_id: user?.id ?? null,
    details: null,
  });
}

export async function listPlatformAudit(params: AuditListParams): Promise<AuditListResult> {
  return auditLogsRepo.listAuditLogs(params);
}

export async function listTenantAudit(
  tenantId: string,
  params: Omit<AuditListParams, 'tenantId'>,
): Promise<AuditListResult> {
  return auditLogsRepo.listAuditLogs({ ...params, tenantId });
}
