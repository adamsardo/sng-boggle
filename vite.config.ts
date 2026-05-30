import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: ["src/worker/**/*.test.ts", "tests/e2e/**", "node_modules/**", "dist/**"],
  },
});
