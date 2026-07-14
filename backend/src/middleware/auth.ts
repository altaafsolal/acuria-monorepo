import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from '../utils/index.js';
import { usersRepo } from '../services/baserow/index.js';
import type { DbUser } from '../types/domain.js';

const USER_CACHE_TTL_MS = 30_000;
interface CachedUser { user: DbUser; expiresAt: number; }
const userCache = new Map<string, CachedUser>();

/** @internal exported for testing */
export function clearAuthUserCache(): void {
  userCache.clear();
}

async function getCachedUser(userId: string): Promise<DbUser | null> {
  const cached = userCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.user;
  const user = await usersRepo.findUserById(userId);
  if (user) userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
  return user;
}

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
    const user = await getCachedUser(payload.user_id);

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
