import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['crypto', 'stream', 'assert', 'buffer', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
    }),
  ],
  define: {
    'process.env': {},
    global: {},
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}); 