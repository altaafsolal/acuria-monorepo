import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authService, auditService } from '../../services/index.js';
import {
  asyncHandler,
  signAccessToken,
  signRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  buildTokenPayload,
} from '../../utils/index.js';

const { findUserByEmail, toPublicUser } = authService;

const router = Router({ mergeParams: true });

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await findUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (!user.email?.trim()) {
    res.status(403).json({ error: 'Account cannot sign in without an email address' });
    return;
  }

  if (user.status === 'pending') {
    res.status(403).json({ error: 'Please set your password using the link sent to your email' });
    return;
  }

  if (user.status && user.status !== 'active') {
    res.status(403).json({ error: 'Account is inactive' });
    return;
  }

  if (!user.password_hash) {
    res.status(403).json({ error: 'Please set your password using the link sent to your email' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const tokenPayload = buildTokenPayload(user);
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.json({
    accessToken,
    user: toPublicUser(user),
  });
  void auditService.recordAuthEvent(user, 'auth.login', req, res).catch((error) => {
    console.error('Audit log write failed:', error);
  });
}));

export default router;
