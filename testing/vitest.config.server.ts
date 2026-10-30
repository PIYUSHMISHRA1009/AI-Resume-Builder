import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['testing/unit/server/**/*.test.ts', 'testing/integration/server/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'testing/data-generators', 'testing/fixtures'],
    globals: true,
    setupFiles: ['testing/setup/test-utils.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'testing/reports/coverage/server',
      include: ['server/**/*.js'],
      exclude: [
        'server/tests/**',
        'server/scripts/**',
        'server/benchmarks/**',
        'server/configs/**',
        'server/server.js',
        'server/services/vectorStore/**',
      ],
    },
    alias: {
      '@server': path.resolve(__dirname, '../server'),
      '@testing': path.resolve(__dirname, './testing'),
    },
  },
});