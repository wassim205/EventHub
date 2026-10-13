import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { disconnectPrisma, prisma } from "./lib/prisma.js";

async function main() {
  await prisma.$connect();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`EventHub API disponible sur http://localhost:${env.PORT}/api`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} reçu, arrêt du serveur...`);
    server.close(async () => {
      await disconnectPrisma();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("Impossible de démarrer le serveur :", error);
  process.exit(1);
});