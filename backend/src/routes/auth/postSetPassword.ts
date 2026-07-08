import { Router } from 'express';
import { auditLogsRepo } from '../../services/baserow/index.js';
import { validatePasswordPair, verifySetPasswordToken, finalizeNewPassword } from '../../services/password-reset.js';
import { asyncHandler } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.post('/set-password', asyncHandler(async (req, res) => {
  const { uid, token, password, passwordConfirm } = req.body as {
    uid?: string;
    token?: string;
    password?: string;
    passwordConfirm?: string;
  };

  if (!uid || !token || !password || !passwordConfirm) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  try {
    validatePasswordPair(password, passwordConfirm);
    await verifySetPasswordToken(uid, token);
    const user = await finalizeNewPassword(uid, password);

    res.json({ message: 'Password set successfully' });
    void auditLogsRepo.createAuditLog({
      user_id: user.id,
      user_email: user.email,
      user_name: user.name,
      user_role: user.role,
      tenant_id: user.tenant_id,
      action: 'auth.password_set',
      method: req.method,
      path: req.originalUrl.split('?')[0] ?? req.originalUrl,
      status_code: res.statusCode,
      entity_type: 'auth',
      entity_id: user.id,
      details: null,
    }).catch((error) => {
      console.error('Audit log write failed:', error);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to set password';
    if (message === 'Invalid or expired token') {
      res.status(400).json({ error: message });
      return;
    }
    res.status(400).json({ error: message });
  }
}));

export default router;
