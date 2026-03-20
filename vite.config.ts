import { defineConfig } from "vite-plus";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";

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
    ...(isDev
      ? {
          hotreload: {
            consumer: "client",
            build: {
              outDir: "dist",
              emptyOutDir: false,
              ...iife,
              rolldownOptions: {
                input: { background: resolve(__dirname, "src/hotreload/index.ts") },
                output: { format: "es" as const, entryFileNames: "[name].js" },
              },
            },
          },
        }
      : {}),
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
      closeBundle() {
        mkdirSync("dist", { recursive: true });
        copyFileSync("src/content-script/filter-ui.css", "dist/filter-ui.css");

        const manifest = JSON.parse(readFileSync("manifest.json", "utf-8"));
        if (isDev) {
          manifest.background = {
            service_worker: "background.js",
            type: "module",
          };
        }
        writeFileSync("dist/manifest.json", JSON.stringify(manifest, null, 2));
      },
    },
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
