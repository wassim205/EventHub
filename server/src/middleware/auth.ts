import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../generated/prisma/enums.js";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/security.js";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

/**
 * Vérifie le JWT d'accès. Le rôle est celui présent dans le token : changer le
 * rôle d'un utilisateur le prend effet à la prochaine émission de token.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("AUTH_TOKEN_MISSING", "Token d'accès manquant.");
  }

  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, email: payload.email, role: payload.role as UserRole };
    next();
  } catch {
    throw AppError.unauthorized("AUTH_TOKEN_INVALID", "Token d'accès invalide ou expiré.");
  }
}

export function requireRole(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized("AUTH_REQUIRED", "Authentification requise.");
    }
    if (!allowed.includes(req.user.role)) {
      throw AppError.forbidden(
        "FORBIDDEN_ROLE",
        "Vous n'avez pas les droits nécessaires pour cette action.",
      );
    }
    next();
  };
}

export function currentUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw AppError.unauthorized("AUTH_REQUIRED", "Authentification requise.");
  }
  return req.user;
}