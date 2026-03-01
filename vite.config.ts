import { defineConfig } from "vitest/config";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "queryable-array",
      formats: ["es", "cjs"],
      fileName: (format) =>
        `queryable-array.${format === "es" ? "mjs" : "cjs"}`,
    },
  },
  plugins: [dts({ rollupTypes: true })],
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json"],
    },
  },
});
