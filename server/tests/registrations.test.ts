import request from "supertest";
import { createApp } from "../src/app.js";
import {
  createEvent,
  createParticipant,
  EventStatus,
  RegistrationStatus,
  testPrisma,
} from "./setupDatabase.js";
import { asAdmin } from "./helpers.js";

const app = createApp();

/** Effectue une inscription et vérifie le code de retour attendu. */
async function register(eventId: string, participantId: string, expectedStatus = 201) {
  const token = await asAdmin(app);
  return request(app)
    .post("/api/registrations")
    .set("Authorization", `Bearer ${token}`)
    .send({ eventId, participantId })
    .expect(expectedStatus);
}

describe("Règle métier : inscription à un événement publié uniquement", () => {
  it("refuse l'inscription sur un événement brouillon", async () => {
    const event = await createEvent({ status: EventStatus.draft });
    const participant = await createParticipant();

    const response = await register(event.id, participant.id, 400);

    expect(response.body.error.code).toBe("EVENT_NOT_PUBLISHED");
  });

  it("refuse l'inscription sur un événement annulé", async () => {
    const event = await createEvent({ status: EventStatus.cancelled });
    const participant = await createParticipant();

    const response = await register(event.id, participant.id, 400);

    expect(response.body.error.code).toBe("EVENT_NOT_PUBLISHED");
  });

  it("accepte l'inscription sur un événement publié", async () => {
    const event = await createEvent({ status: EventStatus.published });
    const participant = await createParticipant();

    const response = await register(event.id, participant.id, 201);

    expect(response.body.data.status).toBe("pending");
    expect(response.body.data.participantId).toBe(participant.id);
  });
});

describe("Règle métier : pas de double inscription", () => {
  it("renvoie 409 sur une seconde inscription du même participant", async () => {
    const event = await createEvent();
    const participant = await createParticipant();

    await register(event.id, participant.id, 201);
    const response = await register(event.id, participant.id, 409);

    expect(response.body.error.code).toBe("ALREADY_REGISTERED");
    expect(await testPrisma.registration.count({ where: { eventId: event.id } })).toBe(1);
  });

  it("autorise le même participant sur un autre événement", async () => {
    const first = await createEvent();
    const second = await createEvent();
    const participant = await createParticipant();

    await register(first.id, participant.id, 201);
    await register(second.id, participant.id, 201);
  });
});

describe("Règle métier : capacité maximale", () => {
  it("bloque l'inscription quand l'événement est complet", async () => {
    const event = await createEvent({ maxParticipants: 1 });

    await register(event.id, (await createParticipant("Premier")).id, 201);

    const response = await register(event.id, (await createParticipant("Second")).id, 409);
    expect(response.body.error.code).toBe("EVENT_FULL");
  });

  it("libère une place quand une inscription est annulée", async () => {
    const event = await createEvent({ maxParticipants: 1 });
    const first = await createParticipant("Premier");
    const second = await createParticipant("Second");

    const registration = await register(event.id, first.id, 201);
    await register(event.id, second.id, 409);

    const token = await asAdmin(app);
    await request(app)
      .patch(`/api/registrations/${registration.body.data.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: RegistrationStatus.cancelled })
      .expect(200);

    await register(event.id, second.id, 201);
  });

  it("n'autorise pas plus de participants que la capacité lors de requêtes concurrentes", async () => {
    const event = await createEvent({ maxParticipants: 2 });
    const participants = await Promise.all([
      createParticipant("Un"),
      createParticipant("Deux"),
      createParticipant("Trois"),
    ]);

    const token = await asAdmin(app);
    const responses = await Promise.all(
      participants.map((participant) =>
        request(app)
          .post("/api/registrations")
          .set("Authorization", `Bearer ${token}`)
          .send({ eventId: event.id, participantId: participant.id }),
      ),
    );

    // Le verrou SELECT ... FOR UPDATE doit laisser passer exactement deux
    // inscriptions sur les trois demandées en parallèle.
    expect(responses.filter((response) => response.status === 201)).toHaveLength(2);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
    expect(await testPrisma.registration.count({ where: { eventId: event.id } })).toBe(2);
  });
});

describe("Règle métier : annulation d'un événement", () => {
  it("annule toutes les inscriptions actives de l'événement", async () => {
    const event = await createEvent({ maxParticipants: 5 });
    await register(event.id, (await createParticipant("Un")).id, 201);
    await register(event.id, (await createParticipant("Deux")).id, 201);

    const other = await createEvent();
    const untouched = await register(other.id, (await createParticipant("Trois")).id, 201);

    const token = await asAdmin(app);
    await request(app)
      .patch(`/api/events/${event.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: EventStatus.cancelled })
      .expect(200);

    const cancelled = await testPrisma.registration.findMany({ where: { eventId: event.id } });
    expect(cancelled).toHaveLength(2);
    expect(cancelled.every((r) => r.status === RegistrationStatus.cancelled)).toBe(true);

    const stillActive = await testPrisma.registration.findUniqueOrThrow({
      where: { id: untouched.body.data.id },
    });
    expect(stillActive.status).toBe("pending");
  });

  it("empêche toute nouvelle inscription après annulation", async () => {
    const event = await createEvent();
    const token = await asAdmin(app);

    await request(app)
      .patch(`/api/events/${event.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: EventStatus.cancelled })
      .expect(200);

    const response = await register(event.id, (await createParticipant("Tardif")).id, 400);
    expect(response.body.error.code).toBe("EVENT_NOT_PUBLISHED");
  });
});

describe("GET /api/registrations", () => {
  it("filtre par événement et par statut", async () => {
    const event = await createEvent();
    await register(event.id, (await createParticipant("Alpha")).id, 201);
    await register(event.id, (await createParticipant("Beta")).id, 201);

    const token = await asAdmin(app);
    const response = await request(app)
      .get(`/api/registrations?eventId=${event.id}&status=${RegistrationStatus.pending}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.meta.total).toBe(2);
    expect(response.body.data).toHaveLength(2);
  });

  it("exige une authentification", async () => {
    await request(app).get("/api/registrations").expect(401);
  });
});

describe("PATCH /api/registrations/:id/status", () => {
  it("refuse de réactiver une inscription sur un événement non publié", async () => {
    const event = await createEvent();
    const registration = await register(event.id, (await createParticipant()).id, 201);

    const token = await asAdmin(app);
    await request(app)
      .patch(`/api/events/${event.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: EventStatus.cancelled })
      .expect(200);

    await request(app)
      .patch(`/api/registrations/${registration.body.data.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: RegistrationStatus.pending })
      .expect(400);
  });

  it("confirme une inscription en attente", async () => {
    const event = await createEvent();
    const registration = await register(event.id, (await createParticipant()).id, 201);

    const token = await asAdmin(app);
    const response = await request(app)
      .patch(`/api/registrations/${registration.body.data.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: RegistrationStatus.confirmed })
      .expect(200);

    expect(response.body.data.status).toBe("confirmed");
  });
});