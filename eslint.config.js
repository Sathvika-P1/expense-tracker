import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default defineConfig(
  globalIgnores(["dist", "node_modules"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintReact.configs["recommended-typescript"],
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
