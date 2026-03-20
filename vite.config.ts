import { defineConfig } from "vite-plus";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const isDev = process.argv.includes("--watch");

const input: Record<string, string> = {
  "content-script": resolve(__dirname, "src/content-script.ts"),
  injected: resolve(__dirname, "src/injected.ts"),
};

if (isDev) {
  input.background = resolve(__dirname, "src/background.ts");
}

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "chrome120",
    rollupOptions: {
      input,
      output: {
        format: "es",
        entryFileNames: "[name].js",
      },
    },
  },
  plugins: [
    {
      name: "copy-extension-files",
      closeBundle() {
        mkdirSync("dist", { recursive: true });
        copyFileSync("src/filter-ui.css", "dist/filter-ui.css");

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
