import { Router } from 'express';
import { auditService } from '../../services/index.js';
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.post('/logout', (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
  res.json({ message: 'Logged out' });
  void auditService.recordAuthEvent(null, 'auth.logout', req, res).catch((error) => {
    console.error('Audit log write failed:', error);
  });
});

export default router;
