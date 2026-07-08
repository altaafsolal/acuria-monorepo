import { Router } from 'express';
import { verifyOtp } from '../../services/password-reset.js';
import { asyncHandler } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.post('/verify-otp', asyncHandler(async (req, res) => {
  const { email, otp } = req.body as { email?: string; otp?: string };

  if (!email?.trim() || !otp?.trim()) {
    res.status(400).json({ error: 'Email and OTP are required' });
    return;
  }

  try {
    const result = await verifyOtp(email.trim(), otp.trim());
    res.json(result);
  } catch {
    res.status(400).json({ error: 'Invalid or expired OTP' });
  }
}));

export default router;
