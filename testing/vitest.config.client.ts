import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['testing/unit/client/**/*.test.tsx', 'testing/integration/client/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'testing/data-generators', 'testing/fixtures', 'testing/e2e'],
    globals: true,
    setupFiles: ['testing/setup/test-utils-client.tsx'],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'testing/reports/coverage/client',
      include: ['client/src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'client/src/main.jsx',
        'client/src/App.jsx',
        'client/src/assets/**',
        'client/src/pages/**',
      ],
    },
    alias: {
      '@client': path.resolve(__dirname, '../client/src'),
      '@testing': path.resolve(__dirname, './testing'),
    },
  },
});