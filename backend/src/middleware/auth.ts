import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from '../utils/index.js';
import { authService } from '../services/index.js';

const { findUserById } = authService;

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    const user = await findUserById(payload.user_id);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as import("../types/domain.js").Role,
      tenantId: user.tenant_id || null,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
}
