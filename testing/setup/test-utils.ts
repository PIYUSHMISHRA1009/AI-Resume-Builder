import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { vi } from 'vitest';
import { setupMockAI, resetMockAI } from './mock-ai.js';

// Set required env vars before any server imports
process.env.IMAGEKIT_PRIVATE_KEY = 'test-private-key';
process.env.IMAGEKIT_PUBLIC_KEY = 'test-public-key';
process.env.IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';

export const JWT_SECRET = 'test-jwt-secret-for-testing-only';
export const TEST_USER_ID = '507f1f77bcf86cd799439011';

export const createTestApp = (routes: any) => {
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  return app;
};

export const generateTestToken = (userId = TEST_USER_ID) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const createAuthHeader = (userId = TEST_USER_ID) => {
  return { Authorization: generateTestToken(userId) };
};

export const createTestUser = (overrides = {}) => ({
  _id: TEST_USER_ID,
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedpassword',
  ...overrides,
});

export const createTestResume = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439044',
  userId: TEST_USER_ID,
  title: 'Test Resume',
  template: 'classic',
  accent_color: '#3B82F6',
  professional_summary: 'Test summary',
  skills: ['JavaScript', 'Node.js', 'React'],
  personal_info: {
    image: ' ',
    full_name: 'Test User',
    profession: 'Software Engineer',
    email: 'test@example.com',
    phone: '555-123-4567',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/testuser',
    website: 'github.com/testuser',
  },
  experience: [
    {
      company: 'Test Corp',
      position: 'Software Engineer',
      start_date: '2022-01',
      end_date: '2024-01',
      description: 'Built features using React and Node.js',
      is_current: true,
    },
  ],
  project: [
    {
      name: 'Test Project',
      type: 'Personal',
      description: 'A test project description',
    },
  ],
  education: [
    {
      institution: 'Test University',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      graduation_date: '2021-06',
      gpa: '3.5',
    },
  ],
  ...overrides,
});

export const createTestJD = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439022',
  userId: TEST_USER_ID,
  title: 'Software Engineer',
  company: 'Target Company',
  category: 'Software Engineering',
  rawText: 'We are looking for a Software Engineer with Node.js and React experience.',
  extractedRequirements: {
    technicalSkills: ['Node.js', 'React', 'JavaScript'],
    softSkills: ['Communication', 'Problem Solving'],
    tools: ['Git', 'Docker'],
    domainSkills: [],
    responsibilities: ['Build features', 'Write tests'],
    experienceYears: 3,
    educationLevel: 'Bachelor',
  },
  ...overrides,
});

export const setupTestEnvironment = async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
  process.env.OPENAI_MODEL = 'gpt-4o-mini';
  process.env.EMBEDDING_MODEL = 'gemini-embedding-2';
  process.env.VECTOR_STORE = 'mongodb';
  process.env.RAG_SIMILARITY_THRESHOLD = '0.3';
  process.env.RAG_TOP_K = '5';
  process.env.RAG_LOG_EVAL = 'false';

  setupMockAI();
};

export const teardownTestEnvironment = () => {
  resetMockAI();
  vi.clearAllMocks();
};

export const expectSuccess = (res: request.Response, status = 200) => {
  expect(res.status).toBe(status);
  expect(res.body).toBeDefined();
};

export const expectError = (res: request.Response, status: number, message?: string) => {
  expect(res.status).toBe(status);
  if (message) {
    expect(res.body.message).toContain(message);
  }
};

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));