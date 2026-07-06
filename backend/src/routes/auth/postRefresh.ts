import { Router } from 'express';
import { auditService } from '../../services/index.js';
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
    void auditService.recordAuthEvent({
      id: payload.user_id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tenantId: null,
    }, 'auth.refresh', req, res).catch((error) => {
      console.error('Audit log write failed:', error);
    });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;
