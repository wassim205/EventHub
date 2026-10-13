// Chargé avant tout import du code applicatif : la configuration d'environnement
// est lue au chargement du module, elle doit donc pointer vers la base de test.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://eventhub:eventhub@localhost:5432/eventhub_test?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret-0123456789";
process.env.ACCESS_TOKEN_TTL = "15m";
process.env.REFRESH_TOKEN_TTL_DAYS = "1";
process.env.REFRESH_COOKIE_NAME = "eventhub_refresh_test";