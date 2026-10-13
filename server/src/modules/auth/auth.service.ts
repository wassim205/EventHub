import type { Response } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
  verifyPassword,
} from "../../lib/security.js";

const publicUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

type SessionUser = { id: string; email: string; role: string };

async function openSession(user: SessionUser) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  return { accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  // Le hash est chargé pour la comparaison mais n'est jamais renvoyé au client.
  const record = await prisma.user.findUnique({
    where: { email },
    select: { ...publicUserSelect, passwordHash: true },
  });

  // Le même message pour un email inconnu et un mauvais mot de passe : on ne
  // révèle pas quelles adresses existent.
  if (!record || !(await verifyPassword(password, record.passwordHash))) {
    throw AppError.unauthorized("INVALID_CREDENTIALS", "Email ou mot de passe incorrect.");
  }

  const { passwordHash, ...user } = record;
  void passwordHash;

  const session = await openSession(user);
  return { ...session, user };
}

export async function refresh(rawToken: string) {
  const tokenHash = hashRefreshToken(rawToken);

  return prisma.$transaction(async (tx) => {
    const stored = await tx.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: publicUserSelect } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      throw AppError.unauthorized("INVALID_REFRESH_TOKEN", "Session expirée, reconnectez-vous.");
    }

    // Rotation : l'ancien token est révoqué et un nouveau est émis à la volée.
    await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    const refreshToken = generateRefreshToken();
    await tx.refreshToken.create({
      data: { tokenHash: hashRefreshToken(refreshToken), userId: stored.userId, expiresAt: refreshTokenExpiry() },
    });

    const accessToken = signAccessToken({
      sub: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    });

    return { accessToken, refreshToken, user: stored.user };
  });
}

export async function logout(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) {
    throw AppError.unauthorized("USER_NOT_FOUND", "Compte introuvable.");
  }
  return user;
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(env.REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.REFRESH_COOKIE_NAME, { path: "/api/auth" });
}