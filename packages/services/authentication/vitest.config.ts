import { defineConfig, mergeConfig } from "vitest/config";
import { config } from "@repo/vitest-config/base";

export default mergeConfig(
  config,
  defineConfig({
    test: {
      typecheck: {
        tsconfig: "./tsconfig.test.json",
      },
    },
  }),
);
