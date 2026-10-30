import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

export default defineConfig({
  root: projectRoot,
  test: {
    environment: 'node',
    include: ['testing/unit/server/**/*.test.ts', 'testing/integration/server/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'testing/data-generators', 'testing/fixtures', 'client'],
    globals: true,
    setupFiles: ['testing/setup/global-setup.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
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
      '@testing': path.resolve(projectRoot, 'testing'),
      '@server': path.resolve(projectRoot, 'server'),
    },
  },
});