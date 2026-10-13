import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import {
  createParticipantSchema,
  listParticipantsQuery,
  participantIdParams,
  updateParticipantSchema,
} from "./participants.schema.js";
import * as participantsService from "./participants.service.js";

export const participantsRouter = Router();

const canManage = requireRole(UserRole.admin, UserRole.staff);

participantsRouter.use(authenticate);

participantsRouter.get("/", canManage, async (req, res) => {
  res.json(await participantsService.listParticipants(listParticipantsQuery.parse(req.query)));
});

participantsRouter.post("/", canManage, async (req, res) => {
  const participant = await participantsService.createParticipant(createParticipantSchema.parse(req.body));
  res.status(201).json({ data: participant });
});

participantsRouter.get("/:id", canManage, async (req, res) => {
  const { id } = participantIdParams.parse(req.params);
  res.json({ data: await participantsService.getParticipant(id) });
});

participantsRouter.put("/:id", canManage, async (req, res) => {
  const { id } = participantIdParams.parse(req.params);
  const input = updateParticipantSchema.parse(req.body);
  res.json({ data: await participantsService.updateParticipant(id, input) });
});

participantsRouter.delete("/:id", requireRole(UserRole.admin), async (req, res) => {
  const { id } = participantIdParams.parse(req.params);
  await participantsService.deleteParticipant(id);
  res.status(204).end();
});