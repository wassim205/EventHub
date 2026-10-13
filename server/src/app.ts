import express from "express";
import cookieParser from "cookie-parser";
import { mountDocs } from "./docs/swagger.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { apiRouter } from "./routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // Derrière nginx, le protocole réel est porté par X-Forwarded-Proto : sans
  // cette confiance `req.secure` serait toujours false et le cookie de session
  // ne serait jamais marqué Secure, même en HTTPS.
  app.set("trust proxy", true);
  app.use(express.json());
  app.use(cookieParser());

  mountDocs(app);
  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}