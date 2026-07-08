import { Router } from 'express';
import { auditLogsRepo } from '../../services/baserow/index.js';
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.post('/logout', (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
  res.json({ message: 'Logged out' });
  void auditLogsRepo.createAuditLog({
    user_id: null,
    user_email: null,
    user_name: null,
    user_role: null,
    tenant_id: null,
    action: 'auth.logout',
    method: req.method,
    path: req.originalUrl.split('?')[0] ?? req.originalUrl,
    status_code: res.statusCode,
    entity_type: 'auth',
    entity_id: null,
    details: null,
  }).catch((error) => {
    console.error('Audit log write failed:', error);
  });
});

export default router;
