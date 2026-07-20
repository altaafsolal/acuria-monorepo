import { env } from '../../config/env.js';

export function webhookUrl(key: keyof typeof env.make): string {
  return env.make[key] || '';
}

export async function postWebhook(url: string, payload: unknown): Promise<Response> {
  if (!url) throw new Error('Make.com webhook URL is not configured');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Make webhook failed (${res.status}): ${text || res.statusText}`);
  }
  return res;
}

/** Keys whose values are secrets/PII and must never be printed to logs. */
const SENSITIVE_KEYS = /otp|password|token|link|secret|base64|signature|email/i;

function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        SENSITIVE_KEYS.test(k) ? [k, '[redacted]'] : [k, redactSensitive(v)],
      ),
    );
  }
  return value;
}

export async function postOptionalWebhook(
  url: string,
  payload: unknown,
  devLogLabel: string,
): Promise<void> {
  if (!url) {
    // Dev-only path (no webhook configured) — redact so OTPs, set-password links
    // and PII never leak into console output.
    console.log(`[dev] ${devLogLabel}:`, JSON.stringify(redactSensitive(payload), null, 2));
    return;
  }
  await postWebhook(url, payload);
}
