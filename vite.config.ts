import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "queryable",
      formats: ["es", "cjs"],
      fileName: (format) => `queryable.${format === "es" ? "mjs" : "cjs"}`,
    },
  },
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
    },
  },
});
