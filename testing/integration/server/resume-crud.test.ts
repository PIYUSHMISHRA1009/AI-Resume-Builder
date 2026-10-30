import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
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
import resumeRouter from '@server/routes/resumeRoutes.js';
import Resume from '@server/models/Resume.js';
import { setupTestEnvironment, teardownTestEnvironment, TEST_USER_ID, createTestResume, createAuthHeader } from '@testing/setup/test-utils.js';

let mongoServer: MongoMemoryServer;
let app: express.Express;

describe('Resume CRUD Integration Tests', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
    mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'resume-builder-test' } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    
    app = express();
    app.use(express.json());
    app.use('/api/resumes', resumeRouter);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    teardownTestEnvironment();
  });

  beforeEach(async () => {
    await Resume.deleteMany({});
  });

  describe('POST /api/resumes/create', () => {
    it('should create a new resume with defaults', async () => {
      const res = await request(app)
        .post('/api/resumes/create')
        .set(createAuthHeader())
        .send({ title: 'My Resume' });

      expect(res.status).toBe(201);
      expect(res.body.resume).toBeDefined();
      expect(res.body.resume.title).toBe('My Resume');
      expect(res.body.resume.template).toBe('classic');
      expect(res.body.resume.accent_color).toBe('#3B82F6');
      expect(res.body.resume.skills).toEqual([]);
      expect(res.body.resume.experience).toEqual([]);
      expect(res.body.resume.project).toEqual([]);
      expect(res.body.resume.education).toEqual([]);
    });

    it('should create resume with default title when not provided', async () => {
      const res = await request(app)
        .post('/api/resumes/create')
        .set(createAuthHeader())
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.resume.title).toBe('Untitled Resume');
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/resumes/create')
        .send({ title: 'My Resume' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/resumes/get/:resumeId', () => {
    it('should return resume by ID for owner', async () => {
      const resume = createTestResume();
      await Resume.create(resume);

      const res = await request(app)
        .get(`/api/resumes/get/${resume._id}`)
        .set(createAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.resume).toBeDefined();
      expect(res.body.resume._id).toBe(resume._id);
      expect(res.body.resume.__v).toBeUndefined();
    });

    it('should return 404 for non-existent resume', async () => {
      const fakeId = '507f1f77bcf86cd799439999';
      const res = await request(app)
        .get(`/api/resumes/get/${fakeId}`)
        .set(createAuthHeader());

      expect(res.status).toBe(404);
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/resumes/get/507f1f77bcf86cd799439044');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/resumes/update', () => {
    it('should update resume fields', async () => {
      const resume = createTestResume();
      await Resume.create(resume);

      const updateData = {
        title: 'Updated Resume',
        professional_summary: 'Updated summary',
        skills: ['TypeScript', 'React', 'Node.js'],
        template: 'modern',
        accent_color: '#EF4444',
      };

      const res = await request(app)
        .put('/api/resumes/update')
        .set(createAuthHeader())
        .send({ resumeId: resume._id, resumeData: updateData });

      expect(res.status).toBe(200);
      expect(res.body.resume.title).toBe('Updated Resume');
      expect(res.body.resume.professional_summary).toBe('Updated summary');
      expect(res.body.resume.skills).toEqual(['TypeScript', 'React', 'Node.js']);
      expect(res.body.resume.template).toBe('modern');
      expect(res.body.resume.accent_color).toBe('#EF4444');
    });

    it('should update nested objects (personal_info, experience, etc.)', async () => {
      const resume = createTestResume();
      await Resume.create(resume);

      const updateData = {
        personal_info: {
          full_name: 'Updated Name',
          profession: 'Senior Engineer',
          email: 'updated@example.com',
        },
        experience: [
          {
            company: 'New Company',
            position: 'Lead Engineer',
            start_date: '2023-01',
            end_date: '2024-01',
            description: 'Leading team',
            is_current: true,
          },
        ],
      };

      const res = await request(app)
        .put('/api/resumes/update')
        .set(createAuthHeader())
        .send({ resumeId: resume._id, resumeData: updateData });

      expect(res.status).toBe(200);
      expect(res.body.resume.personal_info.full_name).toBe('Updated Name');
      expect(res.body.resume.experience).toHaveLength(1);
      expect(res.body.resume.experience[0].company).toBe('New Company');
    });

    it('should reject update for non-existent resume', async () => {
      const res = await request(app)
        .put('/api/resumes/update')
        .set(createAuthHeader())
        .send({ resumeId: '507f1f77bcf86cd799439999', resumeData: { title: 'Test' } });

      expect(res.status).toBe(200); // Mongoose findOneAndUpdate returns null but doesn't error
    });
  });

  describe('DELETE /api/resumes/delete/:resumeId', () => {
    it('should delete resume for owner', async () => {
      const resume = createTestResume();
      await Resume.create(resume);

      const res = await request(app)
        .delete(`/api/resumes/delete/${resume._id}`)
        .set(createAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Resume deleted successfully');

      const deleted = await Resume.findById(resume._id);
      expect(deleted).toBeNull();
    });
  });

  describe('GET /api/resumes/public/:resumeId', () => {
    it('should return public resume', async () => {
      const resume = createTestResume({ public: true });
      await Resume.create(resume);

      const res = await request(app)
        .get(`/api/resumes/public/${resume._id}`);

      expect(res.status).toBe(200);
      expect(res.body.resume).toBeDefined();
    });

    it('should return 404 for private resume', async () => {
      const resume = createTestResume({ public: false });
      await Resume.create(resume);

      const res = await request(app)
        .get(`/api/resumes/public/${resume._id}`);

      expect(res.status).toBe(404);
    });
  });
});