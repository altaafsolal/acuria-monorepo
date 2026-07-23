import { Router } from 'express';
import { usersRepo } from '../../services/baserow/index.js';
import {
  asyncHandler,
  signAccessToken,
  verifyRefreshToken,
  buildTokenPayload,
  REFRESH_COOKIE_NAME,
} from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token missing' });
    return;
  }

  let userId: string;
  try {
    userId = verifyRefreshToken(refreshToken).user_id;
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  // Re-load the user rather than trusting the refresh payload: a deactivated,
  // deleted, or role-changed account must not keep minting valid access tokens
  // for the 7-day refresh lifetime.
  const user = await usersRepo.findUserById(userId);
  if (!user || (user.status && user.status !== 'active')) {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  res.json({ accessToken });
}));

export default router;
