import type { ZodType } from 'zod';
import { HttpError } from './http.js';

/**
 * Parse an untrusted request body against a zod schema, returning the typed,
 * validated value. On failure throws a 400 with a compact message instead of
 * letting unvalidated `as`-cast data flow into the data layer.
 */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join('.') || 'body';
    throw new HttpError(400, `Invalid ${path}: ${first?.message ?? 'validation failed'}`);
  }
  return result.data;
}
