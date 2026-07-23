import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@playground/ide-core/browser': resolve(__dirname, '../../packages/ide-core/src/platform/browser-platform.ts'),
    },
  },
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['better-sqlite3'],
  },
});
