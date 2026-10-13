import { z } from "zod";
import { RegistrationStatus } from "../../generated/prisma/enums.js";
import { paginationSchema } from "../../lib/http.js";

export const registrationIdParams = z.object({ id: z.uuid("Identifiant d'inscription invalide.") });

export const createRegistrationSchema = z.object({
  eventId: z.uuid("eventId doit être un UUID valide."),
  participantId: z.uuid("participantId doit être un UUID valide."),
  status: z.enum(RegistrationStatus).default(RegistrationStatus.pending),
});

export const updateRegistrationStatusSchema = z.object({
  status: z.enum(RegistrationStatus, { message: "Statut invalide : pending, confirmed ou cancelled." }),
});

export const listRegistrationsQuery = paginationSchema.extend({
  eventId: z.uuid().optional(),
  participantId: z.uuid().optional(),
  status: z.enum(RegistrationStatus).optional(),
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
export type ListRegistrationsQuery = z.infer<typeof listRegistrationsQuery>;