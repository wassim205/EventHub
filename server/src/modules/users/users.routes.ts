import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { authenticate, currentUser, requireRole } from "../../middleware/auth.js";
import { createUserSchema, listUsersQuery, updateUserSchema, userIdParams } from "./users.schema.js";
import * as usersService from "./users.service.js";

export const usersRouter = Router();

usersRouter.use(authenticate, requireRole(UserRole.admin));

usersRouter.get("/", async (req, res) => {
  res.json(await usersService.listUsers(listUsersQuery.parse(req.query)));
});

usersRouter.post("/", async (req, res) => {
  const user = await usersService.createUser(createUserSchema.parse(req.body));
  res.status(201).json({ data: user });
});

usersRouter.put("/:id", async (req, res) => {
  const { id } = userIdParams.parse(req.params);
  const user = await usersService.updateUser(id, updateUserSchema.parse(req.body), currentUser(req).id);
  res.json({ data: user });
});

usersRouter.delete("/:id", async (req, res) => {
  const { id } = userIdParams.parse(req.params);
  await usersService.deleteUser(id, currentUser(req).id);
  res.status(204).end();
});