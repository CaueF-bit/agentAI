import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Cada arquivo cria o próprio banco em memória; nenhum teste usa banco de produção.
    env: { NODE_ENV: "test", DEMO_MODE: "true", AI_PROVIDER: "mock" },
  },
});
