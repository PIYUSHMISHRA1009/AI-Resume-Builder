import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

// Global test setup to prevent Mongoose model overwrite errors
beforeAll(() => {
  // Suppress Mongoose overwrite model warnings in tests
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('OverwriteModelError')) {
      return;
    }
    originalWarn.apply(console, args);
  };
});

afterAll(async () => {
  // Clean up mongoose connections
  await mongoose.disconnect();
});