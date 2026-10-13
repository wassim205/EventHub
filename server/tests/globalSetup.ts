import { execSync } from "node:child_process";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://eventhub:eventhub@localhost:5432/eventhub_test?schema=public";

export default function globalSetup(): void {
  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
  });
}