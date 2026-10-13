import { z } from "zod";
import { EventStatus } from "../../generated/prisma/enums.js";
import { dateInput, paginationSchema } from "../../lib/http.js";

export const eventIdParams = z.object({ id: z.uuid("Identifiant d'événement invalide.") });

export const createEventSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères.").max(160),
  description: z.string().trim().min(10, "La description doit contenir au moins 10 caractères.").max(5000),
  location: z.string().trim().min(2, "Le lieu est requis.").max(160),
  eventDate: dateInput,
  maxParticipants: z.coerce
    .number()
    .int("Le nombre de places doit être un entier.")
    .min(1, "Un événement doit accepter au moins 1 participant.")
    .max(10000),
  status: z.enum(EventStatus).default(EventStatus.draft),
});

export const updateEventSchema = createEventSchema.omit({ status: true }).partial();

export const changeEventStatusSchema = z.object({
  status: z.enum(EventStatus, { message: "Statut invalide : draft, published ou cancelled." }),
});

export const listEventsQuery = paginationSchema.extend({
  status: z.enum(EventStatus).optional(),
  date: dateInput.optional(),
  search: z.string().trim().min(1).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuery>;