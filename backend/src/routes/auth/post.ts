import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authService, auditService, passwordResetService } from '../../services/index.js';
import {
  asyncHandler,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
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

router.post('/logout', (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
  res.json({ message: 'Logged out' });
  void auditService.recordAuthEvent(null, 'auth.logout', req, res).catch((error) => {
    console.error('Audit log write failed:', error);
  });
});

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    await passwordResetService.requestPasswordResetOtp(email.trim());
  } catch (error) {
    console.error('Forgot password OTP failed:', error);
  }

  res.json({ message: 'If an account exists for this email, an OTP has been sent' });
}));

router.post('/verify-otp', asyncHandler(async (req, res) => {
  const { email, otp } = req.body as { email?: string; otp?: string };

  if (!email?.trim() || !otp?.trim()) {
    res.status(400).json({ error: 'Email and OTP are required' });
    return;
  }

  try {
    const result = await passwordResetService.verifyOtp(email.trim(), otp.trim());
    res.json(result);
  } catch {
    res.status(400).json({ error: 'Invalid or expired OTP' });
  }
}));

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
    passwordResetService.validatePasswordPair(password, passwordConfirm);
    await passwordResetService.verifySetPasswordToken(uid, token);
    const user = await passwordResetService.finalizeNewPassword(uid, password);

    res.json({ message: 'Password set successfully' });
    void auditService.recordAuthEvent(user, 'auth.password_set', req, res).catch((error) => {
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
