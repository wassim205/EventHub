import request from "supertest";
import { createApp } from "../src/app.js";
import { ADMIN_EMAIL, PASSWORD, STAFF_EMAIL } from "./setupDatabase.js";

const app = createApp();

async function tokenFor(email: string): Promise<string> {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: PASSWORD })
    .expect(200);

  return response.body.data.accessToken as string;
}

describe("POST /api/auth/login", () => {
  it("renvoie un access token et pose le cookie de rafraîchissement", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: PASSWORD })
      .expect(200);

    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.user.email).toBe(ADMIN_EMAIL);
    expect(response.body.data.user).not.toHaveProperty("passwordHash");

    const cookies = response.headers["set-cookie"] as unknown as string[];
    expect(cookies.join(";")).toContain("eventhub_refresh_test");
    expect(cookies.join(";")).toContain("HttpOnly");
  });

  it("refuse un mot de passe incorrect", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: "mauvais-mot-de-passe" })
      .expect(401);

    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("renvoie le même message pour un email inconnu", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "inconnu@test.ma", password: PASSWORD })
      .expect(401);

    expect(response.body.error.message).toBe("Email ou mot de passe incorrect.");
  });

  it("valide le format de l'email", async () => {
    await request(app).post("/api/auth/login").send({ email: "pas-un-email", password: "x" }).expect(400);
  });
});

describe("GET /api/auth/me", () => {
  it("retourne le profil de l'utilisateur authentifié", async () => {
    const token = await tokenFor(ADMIN_EMAIL);
    const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`).expect(200);

    expect(response.body.data.role).toBe("admin");
    expect(response.body.data.email).toBe(ADMIN_EMAIL);
  });

  it("exige un jeton", async () => {
    await request(app).get("/api/auth/me").expect(401);
  });

  it("rejette un jeton falsifié", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.e30.fake")
      .expect(401);

    expect(response.body.error.code).toBe("AUTH_TOKEN_INVALID");
  });
});

describe("Contrôle des rôles", () => {
  it("interdit à un staff l'accès à la gestion des utilisateurs", async () => {
    const token = await tokenFor(STAFF_EMAIL);
    const response = await request(app).get("/api/users").set("Authorization", `Bearer ${token}`).expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("autorise un admin", async () => {
    const token = await tokenFor(ADMIN_EMAIL);
    await request(app).get("/api/users").set("Authorization", `Bearer ${token}`).expect(200);
  });
});

describe("POST /api/auth/refresh", () => {
  it("fait tourner le refresh token et révoque le précédent", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: PASSWORD })
      .expect(200);

    const firstCookie = String(loginResponse.headers["set-cookie"]);
    const refreshed = await agent.post("/api/auth/refresh").expect(200);
    expect(refreshed.body.data.accessToken).toEqual(expect.any(String));

    // Rejouer l'ancien token doit échouer : la rotation l'a révoqué.
    const cookieName = firstCookie.split("=")[0];
    await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${cookieName}=${firstCookie.split("=")[1].split(";")[0]}`)
      .expect(401);
  });

  it("répond 401 sans cookie", async () => {
    await request(app).post("/api/auth/refresh").expect(401);
  });
});