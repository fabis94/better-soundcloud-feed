import type { KnipConfig } from "knip";

const config: KnipConfig = ({ production }) => ({
  entry: production
    ? ["src/content-script/index.ts!", "src/injected/index.ts!"]
    : ["src/content-script/index.ts", "src/injected/index.ts", "src/**/*.test.ts"],
  project: production ? ["src/**/*.ts!", "!src/**/*.test.ts", "!src/test/**"] : ["src/**/*.ts"],
  tags: ["-knipignore"],
  ignoreDependencies: [
    "universal-ai-config", // CLI tool, not imported in code
    "@voidzero-dev/vite-plus-test", // bundled inside vite-plus
    "@vitest/coverage-v8", // used by vp test --coverage, not directly imported
  ],
  // Production pass: only check files and dependencies.
  // Export analysis needs test context to avoid false positives on test-only exports.
  ...(production && {
    exclude: ["exports", "types", "enumMembers"],
  }),
});

export default config;
