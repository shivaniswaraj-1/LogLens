import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { verifyToken } from '../utils/jwt';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Missing or invalid Authorization header'));
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

// Must run after requireAuth. The role is re-read from the database rather
// than trusted from the JWT: a token stays valid until it expires, so relying
// on its embedded role would let a demoted admin keep admin rights for up to
// JWT_EXPIRES_IN. Privileged routes are rare enough that the extra lookup is
// cheap.
export function requireRole(...allowed: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
      if (!user) {
        next(ApiError.unauthorized('User no longer exists'));
        return;
      }
      req.user.role = user.role;
      if (!allowed.includes(user.role)) {
        next(ApiError.forbidden('You do not have permission to perform this action'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
