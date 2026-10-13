import { RegistrationStatus } from "../../generated/prisma/enums.js";
import { AppError } from "../../lib/errors.js";
import { pageArgs, paginated } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateParticipantInput,
  ListParticipantsQuery,
  UpdateParticipantInput,
} from "./participants.schema.js";

export async function listParticipants(query: ListParticipantsQuery) {
  const where = query.search
    ? {
        OR: [
          { fullName: { contains: query.search, mode: "insensitive" as const } },
          { email: { contains: query.search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [participants, total] = await prisma.$transaction([
    prisma.participant.findMany({
      where,
      include: { _count: { select: { registrations: { where: { status: { not: RegistrationStatus.cancelled } } } } } },
      orderBy: { fullName: "asc" },
      ...pageArgs(query),
    }),
    prisma.participant.count({ where }),
  ]);

  return paginated(
    participants.map((participant) => ({ ...participant, registrationsCount: participant._count.registrations })),
    total,
    query,
  );
}

export async function getParticipant(id: string) {
  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { event: { select: { id: true, title: true, eventDate: true, status: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!participant) {
    throw AppError.notFound("PARTICIPANT_NOT_FOUND", "Participant introuvable.");
  }
  return participant;
}

export async function createParticipant(input: CreateParticipantInput) {
  try {
    return await prisma.participant.create({ data: { ...input } });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw AppError.conflict(
        "PARTICIPANT_EMAIL_EXISTS",
        "Un participant existe déjà avec cette adresse email.",
      );
    }
    throw error;
  }
}

export async function updateParticipant(id: string, input: UpdateParticipantInput) {
  await findParticipantOrThrow(id);

  try {
    return await prisma.participant.update({ where: { id }, data: input });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw AppError.conflict(
        "PARTICIPANT_EMAIL_EXISTS",
        "Un participant existe déjà avec cette adresse email.",
      );
    }
    throw error;
  }
}

export async function deleteParticipant(id: string): Promise<void> {
  await findParticipantOrThrow(id);
  await prisma.participant.delete({ where: { id } });
}

async function findParticipantOrThrow(id: string) {
  const participant = await prisma.participant.findUnique({ where: { id }, select: { id: true } });
  if (!participant) {
    throw AppError.notFound("PARTICIPANT_NOT_FOUND", "Participant introuvable.");
  }
  return participant;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}