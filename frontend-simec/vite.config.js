import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const chunkMatchers = {
  runtime: [
    'vite/preload-helper',
    'commonjsHelpers',
  ],
  reactCore: [
    'react',
    'react-dom',
    'scheduler',
  ],
  charts: [
    'chart.js',
    'react-chartjs-2',
  ],
  pdfExport: [
    'jspdf',
    'jspdf-autotable',
    'html2canvas',
    'canvg',
    'dompurify',
    'html2pdf',
  ],
  markdown: [
    'react-markdown',
    'remark-',
    'rehype-',
    'unified',
    'micromark',
    'mdast-',
    'hast-',
    'property-information',
    'space-separated-tokens',
    'comma-separated-tokens',
    'decode-named-character-reference',
    'character-entities',
    'character-reference-invalid',
    'character-entities-legacy',
    'lowlight',
    'highlight.js',
    'vfile',
    'unist-',
  ],
  uiVendor: [
    '@fortawesome',
    'lodash',
  ],
  http: [
    'axios',
  ],
  routing: [
    'react-router',
    '@remix-run',
  ],
  realtime: [
    'socket.io-client',
    'engine.io-client',
    '@socket.io',
  ],
  streaming: [
    '@microsoft/fetch-event-source',
  ],
};

function normalizeModuleId(id) {
  return id.replaceAll('\\', '/');
}

function matchesAny(id, patterns) {
  return patterns.some((pattern) => id.includes(pattern));
}

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
          const normalizedId = normalizeModuleId(id);

          if (matchesAny(normalizedId, chunkMatchers.runtime)) {
            return 'runtime';
          }

          if (!normalizedId.includes('node_modules')) {
            return undefined;
          }

          if (matchesAny(normalizedId, chunkMatchers.reactCore)) {
            return 'react-core';
          }

          if (matchesAny(normalizedId, chunkMatchers.charts)) {
            return 'charts';
          }

          if (matchesAny(normalizedId, chunkMatchers.pdfExport)) {
            return 'pdf-export';
          }

          if (matchesAny(normalizedId, chunkMatchers.markdown)) {
            return 'markdown';
          }

          if (matchesAny(normalizedId, chunkMatchers.uiVendor)) {
            return 'ui-vendor';
          }

          if (matchesAny(normalizedId, chunkMatchers.http)) {
            return 'http';
          }

          if (matchesAny(normalizedId, chunkMatchers.routing)) {
            return 'routing';
          }

          if (matchesAny(normalizedId, chunkMatchers.realtime)) {
            return 'realtime';
          }

          if (matchesAny(normalizedId, chunkMatchers.streaming)) {
            return 'streaming';
          }

          return 'vendor';
        },
      },
    },
  },
});
