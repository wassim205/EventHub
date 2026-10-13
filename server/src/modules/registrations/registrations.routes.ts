import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import {
  createRegistrationSchema,
  listRegistrationsQuery,
  registrationIdParams,
  updateRegistrationStatusSchema,
} from "./registrations.schema.js";
import * as registrationsService from "./registrations.service.js";

export const registrationsRouter = Router();

const canManage = requireRole(UserRole.admin, UserRole.staff);

registrationsRouter.use(authenticate);

registrationsRouter.get("/", canManage, async (req, res) => {
  res.json(await registrationsService.listRegistrations(listRegistrationsQuery.parse(req.query)));
});

registrationsRouter.post("/", canManage, async (req, res) => {
  const registration = await registrationsService.createRegistration(createRegistrationSchema.parse(req.body));
  res.status(201).json({ data: registration });
});

registrationsRouter.patch("/:id/status", canManage, async (req, res) => {
  const { id } = registrationIdParams.parse(req.params);
  const { status } = updateRegistrationStatusSchema.parse(req.body);
  res.json({ data: await registrationsService.updateRegistrationStatus(id, status) });
});