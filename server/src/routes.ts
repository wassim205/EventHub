import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { eventsRouter } from "./modules/events/events.routes.js";
import { participantsRouter } from "./modules/participants/participants.routes.js";
import { registrationsRouter } from "./modules/registrations/registrations.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ data: { status: "ok", service: "eventhub-api" } });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/events", eventsRouter);
apiRouter.use("/participants", participantsRouter);
apiRouter.use("/registrations", registrationsRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/dashboard", dashboardRouter);