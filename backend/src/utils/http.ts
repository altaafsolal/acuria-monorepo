import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  readonly status: number;

  /** Stable, machine-readable error identifier, surfaced as `code` in the JSON
   *  body. Lets callers branch on the failure (e.g. a Make.com scenario routing
   *  SHAREPOINT_REAUTH_REQUIRED to a notification path) without matching on
   *  human-readable message text. */
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function reqParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof HttpError) {
    console.error(`${req.method} ${req.url}:`, err.message);
    res.status(err.status).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  // Log the real detail server-side, but never leak internal error text (Baserow
  // responses, tenant-context messages, axios failures) to the client.
  const detail = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`${req.method} ${req.url}:`, detail);
  res.status(500).json({ error: 'Internal server error' });
};
