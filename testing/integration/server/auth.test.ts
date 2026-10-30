import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Mock ImageKit config before importing server modules
vi.mock('@server/configs/imageKit.js', () => ({
  default: {
    files: {
      upload: vi.fn().mockResolvedValue({ url: 'https://test.imagekit.io/test.png' }),
    },
  },
}));

// Mock Mongoose models to avoid overwrite errors
vi.mock('@server/models/User.js', async () => {
  const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
  }, { timestamps: true });
  userSchema.methods.comparePassword = function(password: string) {
    return password === this.password;
  };
  const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
  return { default: UserModel };
});

vi.mock('@server/models/Resume.js', async () => {
  const resumeSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    title: { type: String, default: 'Untitled Resume' },
    public: { type: Boolean, default: false },
    template: { type: String, default: 'classic' },
    accent_color: { type: String, default: '#3B82F6' },
    professional_summary: { type: String, default: '' },
    skills: [{ type: String }],
    personal_info: {
      image: { type: String, default: ' ' },
      full_name: { type: String, default: ' ' },
      profession: { type: String, default: ' ' },
      email: { type: String, default: ' ' },
      phone: { type: String, default: ' ' },
      location: { type: String, default: ' ' },
      linkedin: { type: String, default: ' ' },
      website: { type: String, default: ' ' },
    },
    experience: [
      {
        company: { type: String },
        position: { type: String },
        start_date: { type: String },
        end_date: { type: String },
        description: { type: String },
        is_current: { type: Boolean },
      },
    ],
    project: [
      {
        name: { type: String },
        type: { type: String },
        description: { type: String },
      },
    ],
    education: [
      {
        institution: { type: String },
        degree: { type: String },
        field: { type: String },
        graduation_date: { type: String },
        gpa: { type: String },
      },
    ],
  }, { timestamps: true, minimize: false });
  const ResumeModel = mongoose.models.Resume || mongoose.model('Resume', resumeSchema);
  return { default: ResumeModel };
});

// Now import the mocked modules
import userRouter from '@server/routes/UserRoutes.js';
import resumeRouter from '@server/routes/resumeRoutes.js';
import User from '@server/models/User.js';
import Resume from '@server/models/Resume.js';
import { setupTestEnvironment, teardownTestEnvironment, JWT_SECRET, TEST_USER_ID, createTestUser, createTestResume, createAuthHeader } from '@testing/setup/test-utils.js';

let mongoServer: MongoMemoryServer;
let app: express.Express;

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
    mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'resume-builder-test' } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    
    app = express();
    app.use(express.json());
    app.use('/api/users', userRouter);
    app.use('/api/resumes', resumeRouter);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    teardownTestEnvironment();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Resume.deleteMany({});
  });

  describe('POST /api/users/register', () => {
    it('should register a new user and return token', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({ name: 'Test User', email: 'new@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('new@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      await User.create(createTestUser());
      
      const res = await request(app)
        .post('/api/users/register')
        .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Already Exists');
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Missing Required Fields');
    });
  });

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      const user = createTestUser();
      user.password = await import('bcrypt').then(bcrypt => bcrypt.hash('password123', 10));
      await User.create(user);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid Email or Password');
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/users/data', () => {
    it('should return user data with valid token', async () => {
      const user = createTestUser();
      await User.create(user);

      const res = await request(app)
        .get('/api/users/data')
        .set(createAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/users/data');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/users/data')
        .set({ Authorization: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/resumes', () => {
    it('should return user resumes', async () => {
      const user = createTestUser();
      await User.create(user);
      
      const resume = createTestResume();
      await Resume.create(resume);

      const res = await request(app)
        .get('/api/users/resumes')
        .set(createAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.resumes).toBeDefined();
      expect(res.body.resumes.length).toBe(1);
    });

    it('should return empty array for user with no resumes', async () => {
      const user = createTestUser();
      await User.create(user);

      const res = await request(app)
        .get('/api/users/resumes')
        .set(createAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.resumes).toEqual([]);
    });
  });
});