import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { getDashboardStats } from "./dashboard.service.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", authenticate, requireRole(UserRole.admin, UserRole.staff), async (_req, res) => {
  res.json({ data: await getDashboardStats() });
});