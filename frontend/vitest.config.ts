import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "../common/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      reportsDirectory: "./coverage",
      allowExternal: true,
      exclude: ["**/*.test.ts", "**/*.test.tsx"],
    },
  },
});
