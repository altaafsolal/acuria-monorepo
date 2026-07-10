import type { Request, Response, NextFunction } from 'express';

export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.user?.tenantId ?? null;
  if (!tenantId) {
    res.status(403).json({ error: 'No tenant assigned to this account' });
    return;
  }
  req.tenantId = tenantId;
  next();
}
