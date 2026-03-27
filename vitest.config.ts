import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts", "tests/**/*.test.ts"],
    globals: true,
  },
});
