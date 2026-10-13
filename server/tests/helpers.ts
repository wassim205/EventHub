import type { Express } from "express";
import request from "supertest";
import { ADMIN_EMAIL, PASSWORD, STAFF_EMAIL } from "./setupDatabase.js";

/** Ouvre une session et renvoie l'access token correspondant. */
export async function loginAs(app: Express, email: string = ADMIN_EMAIL): Promise<string> {
  const response = await request(app).post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
  return response.body.data.accessToken as string;
}

export const asAdmin = (app: Express) => loginAs(app, ADMIN_EMAIL);
export const asStaff = (app: Express) => loginAs(app, STAFF_EMAIL);