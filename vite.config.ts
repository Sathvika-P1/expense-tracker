import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3004,
  },
  test: {
    environment: "jsdom",
    globals: true,
    testTimeout: 20000,
    setupFiles: "./src/setupTests.ts",
  },
});
