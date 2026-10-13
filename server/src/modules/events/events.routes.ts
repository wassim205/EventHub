import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { authenticate, currentUser, requireRole } from "../../middleware/auth.js";
import {
  changeEventStatusSchema,
  createEventSchema,
  eventIdParams,
  listEventsQuery,
  updateEventSchema,
} from "./events.schema.js";
import * as eventsService from "./events.service.js";

export const eventsRouter = Router();

const canManage = requireRole(UserRole.admin, UserRole.staff);

eventsRouter.use(authenticate);

eventsRouter.get("/", async (req, res) => {
  res.json(await eventsService.listEvents(listEventsQuery.parse(req.query)));
});

eventsRouter.post("/", canManage, async (req, res) => {
  const input = createEventSchema.parse(req.body);
  const event = await eventsService.createEvent(input, currentUser(req).id);
  res.status(201).json({ data: event });
});

eventsRouter.get("/:id", async (req, res) => {
  const { id } = eventIdParams.parse(req.params);
  res.json({ data: await eventsService.getEvent(id) });
});

eventsRouter.put("/:id", canManage, async (req, res) => {
  const { id } = eventIdParams.parse(req.params);
  const input = updateEventSchema.parse(req.body);
  res.json({ data: await eventsService.updateEvent(id, input) });
});

eventsRouter.patch("/:id/status", canManage, async (req, res) => {
  const { id } = eventIdParams.parse(req.params);
  const { status } = changeEventStatusSchema.parse(req.body);
  res.json({ data: await eventsService.changeEventStatus(id, status) });
});

eventsRouter.delete("/:id", requireRole(UserRole.admin), async (req, res) => {
  const { id } = eventIdParams.parse(req.params);
  await eventsService.deleteEvent(id);
  res.status(204).end();
});