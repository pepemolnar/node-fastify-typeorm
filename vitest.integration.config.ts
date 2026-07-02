import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  // Vitest's built-in transformer (Oxc in v4, esbuild before) does not emit the
  // reflect-metadata TypeORM needs to build the schema. SWC does — so disable
  // the built-in transform (`oxc: false`) and let unplugin-swc own it.
  plugins: [swc.vite()], // reads emitDecoratorMetadata from tsconfig.json
  oxc: false,
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
