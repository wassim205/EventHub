import type { NextFunction, Request, Response } from "express";
import { ZodError, z } from "zod";
import { AppError } from "../lib/errors.js";
import { env } from "../config/env.js";

type PrismaLikeError = { code: string; meta?: Record<string, unknown> };

function asPrismaError(error: unknown): PrismaLikeError | null {
  if (typeof error !== "object" || error === null) return null;
  const { code, meta } = error as { code?: unknown; meta?: unknown };
  if (typeof code !== "string" || !/^P\d{4}$/.test(code)) return null;
  return { code, meta: typeof meta === "object" && meta !== null ? (meta as Record<string, unknown>) : {} };
}

function fromPrisma(error: PrismaLikeError): AppError {
  const fields = Array.isArray(error.meta?.target) ? (error.meta?.target as string[]).join(", ") : undefined;

  switch (error.code) {
    case "P2002":
      return AppError.conflict(
        "RESOURCE_ALREADY_EXISTS",
        `Cette valeur est déjà utilisée${fields ? ` (${fields})` : ""}.`,
      );
    case "P2003":
      return AppError.badRequest(
        "REFERENCE_INVALID",
        "La ressource référencée n'existe pas ou est encore utilisée.",
      );
    case "P2025":
      return AppError.notFound("RESOURCE_NOT_FOUND", "Ressource introuvable.");
    default:
      return new AppError(500, "DATABASE_ERROR", "Erreur lors de l'accès à la base de données.");
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound("ROUTE_NOT_FOUND", `Route inconnue : ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Les données envoyées sont invalides.",
        details: z.flattenError(error),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
    return;
  }

  const prismaError = asPrismaError(error);
  if (prismaError) {
    const mapped = fromPrisma(prismaError);
    res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
    return;
  }

  // Erreurs levées par express.json() sur un corps illisible (JSON malformé) :
  // elles portent déjà un statut 4xx exploitable au client.
  if (typeof error === "object" && error !== null) {
    const httpError = error as { status?: unknown; statusCode?: unknown; expose?: unknown; message?: unknown };
    const status = typeof httpError.status === "number" ? httpError.status : httpError.statusCode;

    if (typeof status === "number" && status >= 400 && status < 500 && httpError.expose === true) {
      res.status(status).json({
        error: {
          code: "MALFORMED_REQUEST",
          message: typeof httpError.message === "string" ? httpError.message : "Requête invalide.",
        },
      });
      return;
    }
  }

  console.error(error);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Une erreur interne est survenue.",
      ...(env.NODE_ENV === "development" && error instanceof Error
        ? { details: error.message }
        : {}),
    },
  });
}