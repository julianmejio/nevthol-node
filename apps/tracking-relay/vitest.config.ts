import { defineConfig, mergeConfig } from "vitest/config";
import { config } from "@repo/vitest-config/base";

export default mergeConfig(
  config,
  defineConfig({
    test: {
      globalSetup: "./tests/setup/kafka-container.ts",
      server: {
        deps: {
          inline: [/@repo\/contracts/],
        },
      },
    },
  }),
);
