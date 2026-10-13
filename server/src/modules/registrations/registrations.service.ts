import { EventStatus, RegistrationStatus } from "../../generated/prisma/enums.js";
import { AppError } from "../../lib/errors.js";
import { pageArgs, paginated } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateRegistrationInput, ListRegistrationsQuery } from "./registrations.schema.js";

const registrationInclude = {
  event: { select: { id: true, title: true, eventDate: true, status: true, location: true } },
  participant: { select: { id: true, fullName: true, email: true, phone: true } },
} as const;

type LockedEvent = {
  id: string;
  status: EventStatus;
  max_participants: number;
};

/**
 * Vérifie les trois règles métier d'inscription dans une seule transaction :
 * événement publié, pas de doublon, places disponibles.
 *
 * Le `SELECT ... FOR UPDATE` verrouille la ligne de l'événement le temps de la
 * transaction. Sans ce verrou, deux inscriptions simultanées sur la dernière
 * place pourraient toutes deux lire un compteur inférieur à la capacité.
 */
export async function createRegistration(input: CreateRegistrationInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const [event] = await tx.$queryRaw<LockedEvent[]>`
        SELECT id, status, max_participants
        FROM events
        WHERE id = ${input.eventId}::uuid
        FOR UPDATE
      `;

      if (!event) {
        throw AppError.notFound("EVENT_NOT_FOUND", "Événement introuvable.");
      }

      if (event.status !== EventStatus.published) {
        throw AppError.badRequest(
          "EVENT_NOT_PUBLISHED",
          "Impossible de s'inscrire : l'événement n'est pas publié.",
        );
      }

      const participant = await tx.participant.findUnique({
        where: { id: input.participantId },
        select: { id: true },
      });
      if (!participant) {
        throw AppError.notFound("PARTICIPANT_NOT_FOUND", "Participant introuvable.");
      }

      const existing = await tx.registration.findUnique({
        where: { eventId_participantId: { eventId: input.eventId, participantId: input.participantId } },
        select: { id: true },
      });
      if (existing) {
        throw AppError.conflict(
          "ALREADY_REGISTERED",
          "Ce participant est déjà inscrit à cet événement.",
        );
      }

      const taken = await tx.registration.count({
        where: { eventId: input.eventId, status: { not: RegistrationStatus.cancelled } },
      });
      if (taken >= event.max_participants) {
        throw AppError.conflict(
          "EVENT_FULL",
          `Événement complet : ${event.max_participants}/${event.max_participants} places occupées.`,
        );
      }

      return tx.registration.create({
        data: {
          eventId: input.eventId,
          participantId: input.participantId,
          status: input.status,
        },
        include: registrationInclude,
      });
    });
  } catch (error) {
    // Filet de sécurité : la contrainte UNIQUE de la base reste l'arbitre final.
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      throw AppError.conflict(
        "ALREADY_REGISTERED",
        "Ce participant est déjà inscrit à cet événement.",
      );
    }
    throw error;
  }
}

export async function listRegistrations(query: ListRegistrationsQuery) {
  const where = {
    ...(query.eventId ? { eventId: query.eventId } : {}),
    ...(query.participantId ? { participantId: query.participantId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [registrations, total] = await prisma.$transaction([
    prisma.registration.findMany({
      where,
      include: registrationInclude,
      orderBy: { createdAt: "desc" },
      ...pageArgs(query),
    }),
    prisma.registration.count({ where }),
  ]);

  return paginated(registrations, total, query);
}

export async function updateRegistrationStatus(id: string, nextStatus: RegistrationStatus) {
  return prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id },
      include: { event: { select: { status: true, title: true } } },
    });

    if (!registration) {
      throw AppError.notFound("REGISTRATION_NOT_FOUND", "Inscription introuvable.");
    }

    // Un événement annulé ou encore brouillon ne peut pas réactiver de places.
    if (nextStatus !== RegistrationStatus.cancelled && registration.event.status !== EventStatus.published) {
      throw AppError.badRequest(
        "EVENT_NOT_PUBLISHED",
        "Impossible de réactiver une inscription sur un événement non publié.",
      );
    }

    const updated = await tx.registration.update({
      where: { id },
      data: { status: nextStatus },
      include: registrationInclude,
    });

    return updated;
  });
}