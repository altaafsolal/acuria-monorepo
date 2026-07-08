import { Router } from 'express';
import { auditLogsRepo } from '../../services/baserow/index.js';
import {
  signAccessToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
} from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token missing' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({
      user_id: payload.user_id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    });
    res.json({ accessToken });
    void auditLogsRepo.createAuditLog({
      user_id: payload.user_id,
      user_email: payload.email,
      user_name: payload.name,
      user_role: payload.role,
      tenant_id: null,
      action: 'auth.refresh',
      method: req.method,
      path: req.originalUrl.split('?')[0] ?? req.originalUrl,
      status_code: res.statusCode,
      entity_type: 'auth',
      entity_id: payload.user_id,
      details: null,
    }).catch((error) => {
      console.error('Audit log write failed:', error);
    });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;
