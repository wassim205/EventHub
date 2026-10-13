import { PrismaPg } from "@prisma/adapter-pg";
import { EventStatus, RegistrationStatus, UserRole } from "../src/generated/prisma/enums.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { prisma as appPrisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/security.js";

export const testPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export const ADMIN_EMAIL = "admin@test.ma";
export const STAFF_EMAIL = "staff@test.ma";
export const PASSWORD = "Motdepasse1";

let sequence = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;

/**
 * Repart d'une base vide et recrée le strict nécessaire aux tests : les comptes
 * sont insérés avec un hash bcrypt calculé à la volée.
 */
beforeEach(async () => {
  await testPrisma.refreshToken.deleteMany();
  await testPrisma.registration.deleteMany();
  await testPrisma.event.deleteMany();
  await testPrisma.participant.deleteMany();
  await testPrisma.user.deleteMany();

  await testPrisma.user.create({
    data: {
      id: uuid(),
      fullName: "Admin Test",
      email: ADMIN_EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      role: UserRole.admin,
    },
  });

  await testPrisma.user.create({
    data: {
      id: uuid(),
      fullName: "Staff Test",
      email: STAFF_EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      role: UserRole.staff,
    },
  });
});

export async function createEvent(overrides: Partial<{
  title: string;
  status: EventStatus;
  maxParticipants: number;
  eventDate: Date;
  createdById: string;
}> = {}) {
  const admin = await testPrisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  return testPrisma.event.create({
    data: {
      id: uuid(),
      title: overrides.title ?? "Événement de test",
      description: "Description suffisamment longue pour passer la validation.",
      location: "Casablanca",
      eventDate: overrides.eventDate ?? new Date(Date.now() + 7 * 86_400_000),
      maxParticipants: overrides.maxParticipants ?? 10,
      status: overrides.status ?? EventStatus.published,
      createdById: overrides.createdById ?? admin.id,
    },
  });
}

export async function createParticipant(fullName = "Participant Test") {
  return testPrisma.participant.create({
    data: { id: uuid(), fullName, email: `${fullName.toLowerCase().replace(/\s+/g, ".")}@test.ma` },
  });
}

afterAll(async () => {
  await testPrisma.$disconnect();
  // Le client utilisé par l'application sous test garde aussi une connexion
  // ouverte : sans cette fermeture Jest ne termine pas.
  await appPrisma.$disconnect();
});

export { EventStatus, RegistrationStatus, UserRole };