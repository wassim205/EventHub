import { UserRole } from "../../generated/prisma/enums.js";
import { AppError } from "../../lib/errors.js";
import { pageArgs, paginated } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/security.js";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "./users.schema.js";

export async function listUsers(query: ListUsersQuery) {
  const where = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: "insensitive" as const } },
            { email: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
    : {}),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      ...pageArgs(query),
    }),
    prisma.user.count({ where }),
  ]);

  return paginated(users, total, query);
}

export async function createUser(input: CreateUserInput) {
  if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    throw AppError.conflict("USER_EMAIL_EXISTS", "Un compte existe déjà avec cette adresse email.");
  }

  return prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });
}

export async function updateUser(id: string, input: UpdateUserInput, actingUserId: string) {
  const user = await findUserOrThrow(id);

  if (user.role === UserRole.admin && input.role === UserRole.staff && user.id === actingUserId) {
    throw AppError.badRequest("SELF_ROLE_CHANGE", "Vous ne pouvez pas retirer votre propre rôle admin.");
  }

  return prisma.user.update({
    where: { id },
    data: input,
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });
}

export async function deleteUser(id: string, actingUserId: string): Promise<void> {
  if (id === actingUserId) {
    throw AppError.badRequest("SELF_DELETION", "Vous ne pouvez pas supprimer votre propre compte.");
  }
  await findUserOrThrow(id);
  await prisma.user.delete({ where: { id } });
}

async function findUserOrThrow(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user) {
    throw AppError.notFound("USER_NOT_FOUND", "Utilisateur introuvable.");
  }
  return user;
}