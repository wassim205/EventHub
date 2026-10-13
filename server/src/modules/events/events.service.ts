import { EventStatus, RegistrationStatus } from "../../generated/prisma/enums.js";
import { AppError } from "../../lib/errors.js";
import { pageArgs, paginated } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateEventInput, ListEventsQuery, UpdateEventInput } from "./events.schema.js";

// Cycle de vie autorisé : un événement publié peut être annulé, un événement
// annulé peut être remis en brouillon pour être retravaillé.
const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EventStatus.draft]: [EventStatus.published],
  [EventStatus.published]: [EventStatus.cancelled],
  [EventStatus.cancelled]: [EventStatus.draft],
};

const eventListInclude = {
  createdBy: { select: { id: true, fullName: true, email: true } },
  _count: { select: { registrations: { where: { status: { not: RegistrationStatus.cancelled } } } } },
} as const;

function startOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** Forme commune des réponses : le compteur d'inscriptions actives est exposé
 *  directement plutôt que dans `_count`, comme pour les participants. */
function withSeats<T extends { maxParticipants: number; _count: { registrations: number } }>(event: T) {
  return {
    ...event,
    registrationsCount: event._count.registrations,
    remainingSeats: Math.max(0, event.maxParticipants - event._count.registrations),
  };
}

export async function listEvents(query: ListEventsQuery) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.date
      ? { eventDate: { gte: startOfDay(query.date), lt: new Date(startOfDay(query.date).getTime() + 86_400_000) } }
      : {}),
    ...(query.search ? { title: { contains: query.search, mode: "insensitive" as const } } : {}),
  };

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      include: eventListInclude,
      orderBy: { eventDate: "asc" },
      ...pageArgs(query),
    }),
    prisma.event.count({ where }),
  ]);

  return paginated(events.map(withSeats), total, query);
}

export async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, fullName: true, email: true } },
      registrations: {
        include: {
          participant: { select: { id: true, fullName: true, email: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event) {
    throw AppError.notFound("EVENT_NOT_FOUND", "Événement introuvable.");
  }

  const taken = event.registrations.filter((r) => r.status !== RegistrationStatus.cancelled).length;

  return {
    ...event,
    registrationsCount: taken,
    remainingSeats: Math.max(0, event.maxParticipants - taken),
  };
}

export async function createEvent(input: CreateEventInput, createdById: string) {
  const event = await prisma.event.create({
    data: {
      title: input.title,
      description: input.description,
      location: input.location,
      eventDate: input.eventDate,
      maxParticipants: input.maxParticipants,
      status: input.status,
      createdById,
    },
    include: eventListInclude,
  });

  return withSeats(event);
}

export async function updateEvent(id: string, input: UpdateEventInput) {
  await findEventOrThrow(id);

  const event = await prisma.event.update({
    where: { id },
    data: input,
    include: eventListInclude,
  });

  return withSeats(event);
}

export async function changeEventStatus(id: string, nextStatus: EventStatus) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id } });
    if (!event) {
      throw AppError.notFound("EVENT_NOT_FOUND", "Événement introuvable.");
    }

    if (!ALLOWED_TRANSITIONS[event.status].includes(nextStatus)) {
      throw AppError.badRequest(
        "INVALID_STATUS_TRANSITION",
        `Transition impossible : ${event.status} -> ${nextStatus}.`,
      );
    }

    // Republier un événement ne doit pas pouvoir dépasser sa capacité.
    if (nextStatus === EventStatus.published) {
      const taken = await tx.registration.count({
        where: { eventId: id, status: { not: RegistrationStatus.cancelled } },
      });
      if (taken > event.maxParticipants) {
        throw AppError.conflict(
          "CAPACITY_EXCEEDED",
          `Impossible de publier : ${taken} inscriptions actives pour ${event.maxParticipants} places.`,
        );
      }
    }

    const updated = await tx.event.update({
      where: { id },
      data: { status: nextStatus },
      include: eventListInclude,
    });

    // Règle métier : annuler un événement annule toutes ses inscriptions.
    if (nextStatus === EventStatus.cancelled) {
      await tx.registration.updateMany({
        where: { eventId: id, status: { not: RegistrationStatus.cancelled } },
        data: { status: RegistrationStatus.cancelled },
      });
    }

    return withSeats(updated);
  });
}

export async function deleteEvent(id: string): Promise<void> {
  await findEventOrThrow(id);
  await prisma.event.delete({ where: { id } });
}

async function findEventOrThrow(id: string) {
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) {
    throw AppError.notFound("EVENT_NOT_FOUND", "Événement introuvable.");
  }
  return event;
}