import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/stealth/stealth-defuser.ts'),
      name: 'PersonalAdBlockStealth',
      formats: ['iife'],
      fileName: () => 'stealth.js',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
