import { defineConfig } from "vite-plus";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";

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
      name: "copy-extension-files",
      buildStart() {
        // Tell the watcher to watch these non-module files
        this.addWatchFile(resolve(__dirname, "src/content-script/filter-ui.css"));
        this.addWatchFile(resolve(__dirname, "manifest.json"));
      },
      closeBundle() {
        mkdirSync("dist", { recursive: true });
        copyFileSync("src/content-script/filter-ui.css", "dist/filter-ui.css");

        copyFileSync("manifest.json", "dist/manifest.json");
      },
    },
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
