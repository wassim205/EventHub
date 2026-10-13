import { Router } from "express";
import { env } from "../../config/env.js";
import { authenticate, currentUser } from "../../middleware/auth.js";
import { loginSchema } from "./auth.schema.js";
import * as authService from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { accessToken, refreshToken, user } = await authService.login(email, password);

  authService.setRefreshCookie(res, refreshToken);
  res.json({
    data: { accessToken, expiresIn: env.ACCESS_TOKEN_TTL, user },
  });
});

authRouter.post("/refresh", async (req, res) => {
  const rawToken = req.cookies?.[env.REFRESH_COOKIE_NAME];
  if (!rawToken) {
    res.status(401).json({
      error: { code: "REFRESH_TOKEN_MISSING", message: "Aucune session active." },
    });
    return;
  }

  const { accessToken, refreshToken, user } = await authService.refresh(rawToken);
  authService.setRefreshCookie(res, refreshToken);
  res.json({ data: { accessToken, expiresIn: env.ACCESS_TOKEN_TTL, user } });
});

authRouter.post("/logout", async (req, res) => {
  const rawToken = req.cookies?.[env.REFRESH_COOKIE_NAME];
  if (rawToken) {
    await authService.logout(rawToken);
  }
  authService.clearRefreshCookie(res);
  res.status(204).end();
});

authRouter.get("/me", authenticate, async (req, res) => {
  res.json({ data: await authService.getProfile(currentUser(req).id) });
});