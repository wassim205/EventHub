/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.[tj]sx?$": "babel-jest",
  },
  // Les imports du code source utilisent l'extension .js (convention NodeNext) ;
  // on la retire pour que Jest résolve les fichiers .ts.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupDatabase.ts"],
  globalSetup: "<rootDir>/tests/globalSetup.ts",
  testTimeout: 30000,
};