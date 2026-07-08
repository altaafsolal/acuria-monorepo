import { Router } from 'express';
import { requestPasswordResetOtp } from '../../services/password-reset.js';
import { asyncHandler } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    await requestPasswordResetOtp(email.trim());
  } catch (error) {
    console.error('Forgot password OTP failed:', error);
  }

  res.json({ message: 'If an account exists for this email, an OTP has been sent' });
}));

export default router;
