import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["**/*.js", "**/*.cjs", "**/*.mjs", "**/*.d.ts"]),
  {
    files: ["./src/**/*.ts"],
    ignores: ["./dist/**/*", "./coverage/**/*"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  tseslint.configs.recommended,
]);
