import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    // Exclude playwright e2e files
    exclude: ["**/node_modules/**", "**/e2e/**"],
    // Include vitest for unit + integration tests
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // Isolate each test file to avoid shared module-level state bleed
    isolate: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
