import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  FCC_PREFILL_TTL,
  signFccPrefillToken,
  verifyFccPrefillToken,
} from './fcc-token.js';
import { env } from '../config/env.js';

describe('fcc-token', () => {
  it('uses a 15-day TTL', () => {
    expect(FCC_PREFILL_TTL).toBe('15d');
  });

  it('round-trips tenant and record ids', () => {
    const token = signFccPrefillToken({ tenant_id: '42', record_id: '99' });
    expect(verifyFccPrefillToken(token)).toEqual({
      tenant_id: '42',
      record_id: '99',
    });
  });

  it('rejects an expired token', () => {
    const token = jwt.sign(
      { tid: '42', rid: '99' },
      env.fccPrefillSecret,
      { algorithm: 'HS256', expiresIn: -1 },
    );
    expect(verifyFccPrefillToken(token)).toBeNull();
  });
});
