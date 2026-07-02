import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  // esbuild strips decorators WITHOUT emitting reflect-metadata; SWC emits it.
  plugins: [swc.vite()], // reads emitDecoratorMetadata from your tsconfig
  test: {
    globals: true,
    environment: "node",
    include: ["src/test/integration/**/*.test.ts"],
    setupFiles: [], // NOT setup.ts — we want the real DB URL, not the fake one
    testTimeout: 60_000, // container image pull + startup
    hookTimeout: 60_000,
    fileParallelism: false, // one DB; don't let files race each other
  },
});
