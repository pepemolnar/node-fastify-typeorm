import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  // This backend has no CSS, but Vite still runs PostCSS config discovery
  // (postcss-load-config -> lilconfig) during per-file transform, and its
  // shared search cache is not concurrency-safe. Under parallel transforms it
  // can return undefined, surfacing as an intermittent collection-time crash:
  //   TypeError: Cannot read properties of undefined (reading 'config')
  // Supplying an inline PostCSS config makes Vite skip the filesystem search
  // entirely, removing the racy code path while keeping test parallelism.
  css: { postcss: {} },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "src/test/integration/**"], // <- add
  },
});
