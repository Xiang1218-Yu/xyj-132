import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json' assert { type: 'json' };

export default defineConfig({
  plugins: [
    crx({
      manifest,
      browser: 'chrome',
      hmr: {
        port: 7777,
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: false,
    hmr: {
      port: 7777,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
