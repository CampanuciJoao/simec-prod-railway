import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/react/') ||
            id.includes('\\react\\') ||
            id.includes('/react-dom/') ||
            id.includes('\\react-dom\\') ||
            id.includes('/scheduler/') ||
            id.includes('\\scheduler\\')
          ) {
            return 'react-core';
          }

          if (
            id.includes('chart.js') ||
            id.includes('react-chartjs-2')
          ) {
            return 'charts';
          }

          if (
            id.includes('jspdf') ||
            id.includes('jspdf-autotable')
          ) {
            return 'pdf-export';
          }

          if (
            id.includes('react-markdown') ||
            id.includes('remark-gfm') ||
            id.includes('rehype-highlight')
          ) {
            return 'markdown';
          }

          if (
            id.includes('@fortawesome') ||
            id.includes('lodash')
          ) {
            return 'ui-vendor';
          }

          if (id.includes('axios')) {
            return 'http';
          }

          if (
            id.includes('react-router') ||
            id.includes('@remix-run')
          ) {
            return 'routing';
          }

          if (
            id.includes('socket.io-client') ||
            id.includes('engine.io-client') ||
            id.includes('@socket.io')
          ) {
            return 'realtime';
          }

          if (id.includes('@microsoft/fetch-event-source')) {
            return 'streaming';
          }

          return 'vendor';
        },
      },
    },
  },
});
