import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    resolve: {
      tsconfigPaths: true,
    },
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        inline: [/@repo\/contracts/],
      },
    },
  },
});
