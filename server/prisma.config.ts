import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `process.env` et non le helper `env()` : ce dernier lève une erreur si la
    // variable est absente, ce qui ferait échouer `prisma generate` pendant la
    // construction de l'image, où aucune base n'est encore joignable.
    // L'application valide elle-même DATABASE_URL au démarrage (config/env.ts).
    url: process.env.DATABASE_URL ?? "",
  },
});