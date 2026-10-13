import { z } from "zod";
import { UserRole } from "../../generated/prisma/enums.js";
import { paginationSchema } from "../../lib/http.js";

export const userIdParams = z.object({ id: z.uuid("Identifiant utilisateur invalide.") });

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(200);

export const createUserSchema = z.object({
  fullName: z.string().trim().min(3, "Le nom complet doit contenir au moins 3 caractères.").max(120),
  email: z.string().trim().toLowerCase().email("Adresse email invalide.").max(180),
  password: passwordSchema,
  role: z.enum(UserRole).default(UserRole.staff),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(3).max(120).optional(),
  role: z.enum(UserRole).optional(),
});

export const listUsersQuery = paginationSchema.extend({
  role: z.enum(UserRole).optional(),
  search: z.string().trim().min(1).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuery>;