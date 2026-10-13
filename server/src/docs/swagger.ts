import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { parse } from "yaml";

const spec = parse(
  readFileSync(fileURLToPath(new URL("../../openapi.yaml", import.meta.url)), "utf8"),
);

export function mountDocs(app: express.Express): void {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: "EventHub API" }));
}