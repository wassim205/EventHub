import { z } from "zod";
import { paginationSchema } from "../../lib/http.js";

export const participantIdParams = z.object({ id: z.uuid("Identifiant de participant invalide.") });

const phoneSchema = z
  .string()
  .trim()
  .min(6, "Le numéro de téléphone doit contenir au moins 6 caractères.")
  .max(30)
  .regex(/^[+\d][\d\s().-]*$/, "Format de téléphone invalide.");

export const createParticipantSchema = z.object({
  fullName: z.string().trim().min(3, "Le nom complet doit contenir au moins 3 caractères.").max(140),
  email: z.string().trim().toLowerCase().email("Adresse email invalide.").max(180),
  phone: z.preprocess((value) => (value === "" || value === null ? undefined : value), phoneSchema.optional()),
});

export const updateParticipantSchema = createParticipantSchema.partial();

export const listParticipantsQuery = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
});

export type CreateParticipantInput = z.infer<typeof createParticipantSchema>;
export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>;
export type ListParticipantsQuery = z.infer<typeof listParticipantsQuery>;