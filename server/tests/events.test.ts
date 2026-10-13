import request from "supertest";
import { createApp } from "../src/app.js";
import { createEvent, createParticipant, EventStatus, testPrisma } from "./setupDatabase.js";
import { asAdmin, asStaff } from "./helpers.js";

const app = createApp();

const validPayload = {
  title: "Conférence de test",
  description: "Une description suffisamment longue pour être acceptée.",
  location: "Casablanca",
  eventDate: new Date(Date.now() + 86_400_000).toISOString(),
  maxParticipants: 25,
};

describe("POST /api/events", () => {
  it("crée un événement en brouillon", async () => {
    const token = await asAdmin(app);
    const response = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send(validPayload)
      .expect(201);

    expect(response.body.data.status).toBe("draft");
    expect(response.body.data.maxParticipants).toBe(25);
    expect(response.body.data.registrationsCount).toBe(0);
  });

  it("refuse un payload invalide avec le détail des champs", async () => {
    const token = await asAdmin(app);
    const response = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "x", maxParticipants: 0 })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details.fieldErrors).toHaveProperty("title");
  });

  it("exige le rôle admin ou staff", async () => {
    await request(app).post("/api/events").send(validPayload).expect(401);
  });

  it("autorise un staff à créer un événement", async () => {
    const token = await asStaff(app);
    await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send(validPayload)
      .expect(201);
  });
});

describe("GET /api/events", () => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  beforeEach(async () => {
    await createEvent({ title: "Événement publié", status: EventStatus.published, eventDate: today });
    await createEvent({ title: "Événement brouillon", status: EventStatus.draft, eventDate: today });
    await createEvent({ title: "Événement annulé", status: EventStatus.cancelled, eventDate: today });
  });

  it("filtre par statut", async () => {
    const token = await asAdmin(app);
    const response = await request(app)
      .get("/api/events?status=published")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0].title).toBe("Événement publié");
  });

  it("retourne la pagination attendue", async () => {
    const token = await asAdmin(app);
    const response = await request(app)
      .get("/api/events?page=1&limit=2")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  it("filtre par jour de l'événement", async () => {
    const token = await asAdmin(app);
    const todayIso = new Date().toISOString().slice(0, 10);

    const response = await request(app)
      .get(`/api/events?date=${todayIso}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(3);
  });

  it("filtre par intitulé, sans distinction de casse", async () => {
    const token = await asAdmin(app);
    const response = await request(app)
      .get("/api/events?search=BROUIL")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
  });
});

describe("Cycle de vie d'un événement", () => {
  it("suit draft -> published -> cancelled -> draft", async () => {
    const event = await createEvent({ status: EventStatus.draft });
    const token = await asAdmin(app);

    const published = await request(app)
      .patch(`/api/events/${event.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: EventStatus.published })
      .expect(200);
    expect(published.body.data.status).toBe("published");

    const cancelled = await request(app)
      .patch(`/api/events/${event.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: EventStatus.cancelled })
      .expect(200);
    expect(cancelled.body.data.status).toBe("cancelled");

    const restored = await request(app)
      .patch(`/api/events/${event.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: EventStatus.draft })
      .expect(200);
    expect(restored.body.data.status).toBe("draft");
  });

  it("refuse une transition non autorisée", async () => {
    const event = await createEvent({ status: EventStatus.draft });
    const token = await asAdmin(app);

    const response = await request(app)
      .patch(`/api/events/${event.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: EventStatus.cancelled })
      .expect(400);

    expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("refuse un statut inconnu", async () => {
    const event = await createEvent();
    const token = await asAdmin(app);

    await request(app)
      .patch(`/api/events/${event.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "termine" })
      .expect(400);
  });
});

describe("GET /api/events/:id", () => {
  it("retourne l'événement avec ses inscriptions", async () => {
    const event = await createEvent({ maxParticipants: 3 });
    const participant = await createParticipant();

    const token = await asAdmin(app);
    await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event.id, participantId: participant.id })
      .expect(201);

    const response = await request(app)
      .get(`/api/events/${event.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.registrations).toHaveLength(1);
    expect(response.body.data.registrationsCount).toBe(1);
    expect(response.body.data.remainingSeats).toBe(2);
    expect(response.body.data.registrations[0].participant.fullName).toBe(participant.fullName);
  });

  it("renvoie 404 sur un identifiant inconnu", async () => {
    const token = await asAdmin(app);
    const response = await request(app)
      .get("/api/events/11111111-1111-4111-8111-111111111111")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error.code).toBe("EVENT_NOT_FOUND");
  });
});

describe("Participants", () => {
  it("rejette un email déjà utilisé", async () => {
    const token = await asAdmin(app);
    await request(app)
      .post("/api/participants")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Première Personne", email: "doublon@test.ma" })
      .expect(201);

    const response = await request(app)
      .post("/api/participants")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Seconde Personne", email: "doublon@test.ma" })
      .expect(409);

    expect(response.body.error.code).toBe("PARTICIPANT_EMAIL_EXISTS");
  });

  it("recherche par nom ou par email", async () => {
    await createParticipant("Salma Benali");

    const token = await asAdmin(app);
    const byName = await request(app)
      .get("/api/participants?search=benali")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(byName.body.meta.total).toBe(1);

    const byEmail = await request(app)
      .get("/api/participants?search=salma.benali@test.ma")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(byEmail.body.meta.total).toBe(1);
  });

  it("supprime un participant et ses inscriptions", async () => {
    const event = await createEvent();
    const participant = await createParticipant();

    const token = await asAdmin(app);
    await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event.id, participantId: participant.id })
      .expect(201);

    await request(app)
      .delete(`/api/participants/${participant.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    expect(await testPrisma.registration.count({ where: { participantId: participant.id } })).toBe(0);
  });
});

describe("GET /api/dashboard", () => {
  it("retourne les compteurs et le top 5", async () => {
    const event = await createEvent({ maxParticipants: 4, status: EventStatus.published });
    await createEvent({ status: EventStatus.draft });

    const participant = await createParticipant();
    const token = await asAdmin(app);
    await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${token}`)
      .send({ eventId: event.id, participantId: participant.id })
      .expect(201);

    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.totals.events).toBe(2);
    expect(response.body.data.totals.publishedEvents).toBe(1);
    expect(response.body.data.totals.draftEvents).toBe(1);
    expect(response.body.data.totals.registrationsToday).toBe(1);
    expect(response.body.data.topEvents[0]).toMatchObject({
      title: "Événement de test",
      registrationsCount: 1,
      maxParticipants: 4,
      fillRate: 25,
    });
  });

  it("ignore les événements annulés dans le top 5", async () => {
    const cancelled = await createEvent({ status: EventStatus.cancelled });
    await testPrisma.registration.create({
      data: {
        eventId: cancelled.id,
        participantId: (await createParticipant("Inscrit")).id,
        status: "pending",
      },
    });

    const token = await asAdmin(app);
    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.topEvents).toHaveLength(0);
  });
});