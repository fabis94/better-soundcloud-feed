import { defineConfig } from "vite-plus";
import { resolve } from "node:path";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const isDev = process.argv.includes("--watch");

const iife = {
  sourcemap: true as const,
  target: "chrome120" as const,
};

export default defineConfig({
  define: {
    __DEV__: JSON.stringify(isDev),
  },
  environments: {
    client: {
      build: {
        outDir: "dist",
        emptyOutDir: false,
        ...iife,
        rolldownOptions: {
          input: { "content-script": resolve(__dirname, "src/content-script/index.ts") },
          output: { format: "iife", entryFileNames: "[name].js" },
        },
      },
    },
    injected: {
      consumer: "client",
      build: {
        outDir: "dist",
        emptyOutDir: false,
        ...iife,
        rolldownOptions: {
          input: { injected: resolve(__dirname, "src/injected/index.ts") },
          output: { format: "iife", entryFileNames: "[name].js" },
        },
      },
    },
  },
  builder: {
    async buildApp(builder) {
      // Clean dist once before building all environments
      rmSync("dist", { recursive: true, force: true });
      mkdirSync("dist", { recursive: true });
      for (const env of Object.values(builder.environments)) {
        await builder.build(env);
      }
    },
  },
  plugins: [
    {
      name: "no-test-bundle",
      resolveId(source) {
        if (/\.test\./.test(source)) {
          this.error(`Test file "${source}" must not be imported in production code`);
        }
      },
    },
    {
      name: "copy-public",
      buildStart() {
        this.addWatchFile(resolve(__dirname, "public"));
      },
      closeBundle() {
        cpSync("public", "dist", { recursive: true });
      },
    },
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
