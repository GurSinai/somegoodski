import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Bump to give every built script a new URL. Earlier releases told browsers to keep scripts for
// a year, and a server hiccup cached a page in place of the PDF library under its old name.
const BUILD_GENERATION = 2;

export default defineConfig({
  plugins: [react()],
  // relative asset URLs: the same build works locally and under https://<user>.github.io/somegoodski/
  base: './',
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].g${BUILD_GENERATION}.js`,
        chunkFileNames: `assets/[name]-[hash].g${BUILD_GENERATION}.js`,
      },
    },
  },
});
