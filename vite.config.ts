import { defineConfig } from 'vite-plus';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync } from 'node:fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'chrome120',
    rollupOptions: {
      input: {
        'content-script': resolve(__dirname, 'src/content-script.ts'),
        injected: resolve(__dirname, 'src/injected.ts'),
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
      },
    },
  },
  plugins: [
    {
      name: 'copy-extension-files',
      closeBundle() {
        mkdirSync('dist', { recursive: true });
        copyFileSync('manifest.json', 'dist/manifest.json');
        copyFileSync('src/filter-ui.css', 'dist/filter-ui.css');
      },
    },
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
