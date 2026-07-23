import { Router } from 'express';
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
    await finalizeNewPassword(uid, password);

    res.json({ message: 'Password set successfully' });
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
