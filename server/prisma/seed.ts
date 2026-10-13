import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/passwords.js";
import { EventStatus, RegistrationStatus, UserRole } from "../src/generated/prisma/enums.js";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ADMIN_EMAIL = "admin@eventhub.ma";
const STAFF_EMAIL = "staff@eventhub.ma";

const ids = {
  admin: "11111111-1111-4111-8111-111111111111",
  staff: "22222222-2222-4222-8222-222222222222",
  events: {
    devops: "a0000000-0000-4000-8000-000000000001",
    react: "a0000000-0000-4000-8000-000000000002",
    typescript: "a0000000-0000-4000-8000-000000000003",
    hackathon: "a0000000-0000-4000-8000-000000000004",
    sessions: "a0000000-0000-4000-8000-000000000005",
  },
  participants: Array.from({ length: 10 }, (_, index) =>
    `b0000000-0000-4000-8000-0000000000${String(index + 10).padStart(2, "0")}`,
  ),
};

const days = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date;
};

const at = (offset: number, hours: number) => {
  const date = days(offset);
  date.setHours(hours, 0, 0, 0);
  return date;
};

const participants = [
  { fullName: "Salma Benali", email: "salma.benali@example.ma", phone: "+212 6 12 34 56 78" },
  { fullName: "Youssef El Amrani", email: "youssef.elamrani@example.ma", phone: "+212 6 22 45 67 89" },
  { fullName: "Imane Tazi", email: "imane.tazi@example.ma", phone: null },
  { fullName: "Karim Berrada", email: "karim.berrada@example.ma", phone: "+212 6 33 56 78 90" },
  { fullName: "Nadia Cherkaoui", email: "nadia.cherkaoui@example.ma", phone: "+212 6 44 67 89 01" },
  { fullName: "Mehdi Ouazzani", email: "mehdi.ouazzani@example.ma", phone: null },
  { fullName: "Louise Fontaine", email: "louise.fontaine@example.fr", phone: "+33 6 12 45 78 90" },
  { fullName: "Anas Benjelloun", email: "anas.benjelloun@example.ma", phone: "+212 6 55 78 90 12" },
  { fullName: "Fatima Zahra Idrissi", email: "fatima.idrissi@example.ma", phone: "+212 6 66 78 90 23" },
  { fullName: "Thomas Leroy", email: "thomas.leroy@example.fr", phone: null },
];

async function main() {
  await prisma.refreshToken.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      {
        id: ids.admin,
        fullName: "Wassim El Mourabit",
        email: ADMIN_EMAIL,
        passwordHash: await hashPassword("Admin@2026"),
        role: UserRole.admin,
      },
      {
        id: ids.staff,
        fullName: "Salma Benali",
        email: STAFF_EMAIL,
        passwordHash: await hashPassword("Staff@2026"),
        role: UserRole.staff,
      },
    ],
  });

  await prisma.participant.createMany({
    data: participants.map((participant, index) => ({
      id: ids.participants[index],
      ...participant,
      createdAt: days(-45 + index),
    })),
  });

  await prisma.event.createMany({
    data: [
      {
        id: ids.events.devops,
        title: "Conférence DevOps Casablanca",
        description:
          "Une journée de retours d'expérience sur les pipelines, l'observabilité et le déploiement continu, animée par des ingénieurs de la communauté.",
        location: "Palais des Congrès, Casablanca",
        eventDate: at(24, 9),
        maxParticipants: 120,
        status: EventStatus.published,
        createdById: ids.admin,
        createdAt: days(-30),
      },
      {
        id: ids.events.react,
        title: "Atelier React & Vite",
        description:
          "Atelier pratique de deux heures sur la construction d'une interface avec React, Vite et la gestion des formulaires. Places volontairement limitées pour un format en petit groupe.",
        location: "Coworking Al Qods, Casablanca",
        eventDate: at(9, 18),
        maxParticipants: 3,
        status: EventStatus.published,
        createdById: ids.staff,
        createdAt: days(-20),
      },
      {
        id: ids.events.typescript,
        title: "Meetup TypeScript Casablanca",
        description:
          "Soirée de partage autour du typage advanced, de la migration d'un projet JavaScript et des outils d'analyse statique.",
        location: "Maison des startups, Rabat",
        eventDate: at(16, 19),
        maxParticipants: 50,
        status: EventStatus.published,
        createdById: ids.admin,
        createdAt: days(-15),
      },
      {
        id: ids.events.hackathon,
        title: "Hackathon AgroTech",
        description:
          "Weekend de prototypage autour des outils de gestion agricole. Le programme détaillé et les modalités d'inscription seront communiqués prochainement.",
        location: "Technopolis, Benguerir",
        eventDate: at(45, 8),
        maxParticipants: 80,
        status: EventStatus.draft,
        createdById: ids.staff,
        createdAt: days(-5),
      },
      {
        id: ids.events.sessions,
        title: "EventHub Sessions — édition hiver",
        description:
          "La session de concerts annuelle de l'association. Annulée en raison d'un conflit de dates avec la Koppa.",
        location: "Villa des Arts, Casablanca",
        eventDate: days(-12),
        maxParticipants: 300,
        status: EventStatus.cancelled,
        createdById: ids.admin,
        createdAt: days(-40),
      },
    ],
  });

  // 20 inscriptions au total, réparties uniquement sur les événements publiés.
  const registrations = [
    { event: ids.events.devops, participant: 0, status: RegistrationStatus.confirmed, createdAt: days(-12) },
    { event: ids.events.devops, participant: 1, status: RegistrationStatus.confirmed, createdAt: days(-11) },
    { event: ids.events.devops, participant: 2, status: RegistrationStatus.pending, createdAt: days(-10) },
    { event: ids.events.devops, participant: 3, status: RegistrationStatus.confirmed, createdAt: days(-9) },
    { event: ids.events.devops, participant: 4, status: RegistrationStatus.cancelled, createdAt: days(-8) },
    { event: ids.events.devops, participant: 5, status: RegistrationStatus.confirmed, createdAt: days(-3) },
    { event: ids.events.devops, participant: 6, status: RegistrationStatus.pending, createdAt: days(-1) },
    { event: ids.events.devops, participant: 7, status: RegistrationStatus.confirmed, createdAt: days(0) },
    { event: ids.events.devops, participant: 8, status: RegistrationStatus.pending, createdAt: days(0) },
    { event: ids.events.devops, participant: 9, status: RegistrationStatus.confirmed, createdAt: days(0) },

    // Événement complet : 3 places, 3 inscriptions actives.
    { event: ids.events.react, participant: 0, status: RegistrationStatus.confirmed, createdAt: days(-6) },
    { event: ids.events.react, participant: 2, status: RegistrationStatus.pending, createdAt: days(-2) },
    { event: ids.events.react, participant: 5, status: RegistrationStatus.confirmed, createdAt: days(0) },

    { event: ids.events.typescript, participant: 1, status: RegistrationStatus.pending, createdAt: days(-7) },
    { event: ids.events.typescript, participant: 3, status: RegistrationStatus.confirmed, createdAt: days(-7) },
    { event: ids.events.typescript, participant: 4, status: RegistrationStatus.pending, createdAt: days(-4) },
    { event: ids.events.typescript, participant: 6, status: RegistrationStatus.confirmed, createdAt: days(-2) },
    { event: ids.events.typescript, participant: 7, status: RegistrationStatus.cancelled, createdAt: days(-2) },
    { event: ids.events.typescript, participant: 8, status: RegistrationStatus.pending, createdAt: days(0) },
    { event: ids.events.typescript, participant: 9, status: RegistrationStatus.pending, createdAt: days(0) },
  ];

  await prisma.registration.createMany({
    data: registrations.map((registration) => ({
      id: crypto.randomUUID(),
      eventId: registration.event,
      participantId: ids.participants[registration.participant],
      status: registration.status,
      createdAt: registration.createdAt,
    })),
  });

  console.log("Seed terminé.");
  console.log(`  ${await prisma.user.count()} utilisateurs`);
  console.log(`  ${await prisma.event.count()} événements`);
  console.log(`  ${await prisma.participant.count()} participants`);
  console.log(`  ${await prisma.registration.count()} inscriptions`);
  console.log(`\nConnexions de démonstration :`);
  console.log(`  admin : ${ADMIN_EMAIL} / Admin@2026`);
  console.log(`  staff : ${STAFF_EMAIL} / Staff@2026`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });