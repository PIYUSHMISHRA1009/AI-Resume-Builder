import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

let mongoServer: MongoMemoryServer;

export const setupTestDB = async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'resume-builder-test',
    },
    binary: {
      version: '7.0.0',
    },
  });
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS = '5000';
  await mongoose.connect(uri);
};

export const teardownTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
};

export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};

export const getTestDB = () => mongoose.connection.db;

vi.setConfig({ testTimeout: 60000 });