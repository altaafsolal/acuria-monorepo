import { rateLimit } from 'express-rate-limit';

/**
 * Strict limiter for credential-guessing surfaces (login, OTP verify/request,
 * password set). Low ceiling per IP over a 15-minute window — pairs with the
 * per-account OTP lockout in password-reset.ts.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

/** Looser catch-all limiter applied to the whole API. */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' },
});
