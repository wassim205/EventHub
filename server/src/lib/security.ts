import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: string;
};

/**
 * Le refresh token n'est pas un JWT : c'est une valeur aléatoire opaque dont
 * seul le hash SHA-256 est stocké. Une fuite de la base ne permet donc pas de
 * rejouer une session, et le token peut être révoqué côté serveur.
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign({ email: payload.email, role: payload.role }, env.JWT_ACCESS_SECRET, {
    subject: payload.sub,
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}