import {config} from "@repo/eslint-config/base";
import { defineConfig, globalIgnores } from "eslint/config";

/** @type {import("eslint").Linter.Config} */
export default defineConfig([
    globalIgnores(["src/generated/**/*"]),
    {
    extends: [config]
}]);