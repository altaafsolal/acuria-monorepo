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

export async function postOptionalWebhook(
  url: string,
  payload: unknown,
  devLogLabel: string,
): Promise<void> {
  if (!url) {
    console.log(`[dev] ${devLogLabel}:`, JSON.stringify(payload, null, 2));
    return;
  }
  await postWebhook(url, payload);
}
