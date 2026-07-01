import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,          // use describe/it/expect without imports
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
  },
});