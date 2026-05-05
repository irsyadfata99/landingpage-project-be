import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./src",
  testMatch: ["**/__tests__/**/*.test.ts"],
  globalSetup: "../jest.global-setup.ts",
  globalTeardown: "../jest.global-teardown.ts",
  coverageDirectory: "../coverage",
  collectCoverageFrom: [
    "**/*.ts",
    "!**/__tests__/**",
    "!**/types/**",
    "!server.ts",
  ],
  testTimeout: 30000,
  forceExit: true,
};

export default config;
