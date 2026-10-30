import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Mock ImageKit config before importing server modules
vi.mock('@server/configs/imageKit.js', () => ({
  default: {
    files: {
      upload: vi.fn().mockResolvedValue({ url: 'https://test.imagekit.io/test.png' }),
    },
  },
}));

// Mock Mongoose models to avoid overwrite errors and ensure they use test connection
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
import { setupTestEnvironment, teardownTestEnvironment, TEST_USER_ID, createAuthHeader } from '@testing/setup/test-utils.js';

const __dirname = join(fileURLToPath(import.meta.url), '..', '..', '..');
const FIXTURES_DIR = join(__dirname, 'fixtures', 'generated');

let mongoServer: MongoMemoryServer;
let app: express.Express;
let validResumes: any[];

describe('D1.B: CRUD Integration with Generated Dataset', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
    mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'resume-builder-test-crud' } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    
    // Wait for connection to be fully ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('MongoDB connection timeout')), 30000);
      if (mongoose.connection.readyState === 1) {
        clearTimeout(timeout);
        resolve();
      } else {
        mongoose.connection.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        mongoose.connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      }
    });
    
    app = express();
    app.use(express.json());
    app.use('/api/resumes', resumeRouter);
    
    // Load the generated dataset
    const validFile = join(FIXTURES_DIR, 'resumes-42.json');
    validResumes = JSON.parse(readFileSync(validFile, 'utf-8'));
    expect(validResumes.length).toBe(1000);
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

  describe('CREATE - Using Generated Resumes', () => {
    it('should create a resume from generated dataset (first 10)', async () => {
      const testResumes = validResumes.slice(0, 10);
      
      for (const resume of testResumes) {
        const { _meta, ...resumeData } = resume;
        
        const res = await request(app)
          .post('/api/resumes/create')
          .set(createAuthHeader())
          .send({ 
            title: resumeData.title,
            template: resumeData.template,
            accent_color: resumeData.accent_color,
            professional_summary: resumeData.professional_summary,
            skills: resumeData.skills,
            personal_info: resumeData.personal_info,
            experience: resumeData.experience,
            project: resumeData.project,
            education: resumeData.education,
            public: resumeData.public,
          });

        expect(res.status).toBe(201);
        expect(res.body.resume).toBeDefined();
        expect(res.body.resume.title).toBe(resumeData.title);
        expect(res.body.resume._id).toBeDefined();
        
        // Verify the saved resume can be retrieved
        const getRes = await request(app)
          .get(`/api/resumes/get/${res.body.resume._id}`)
          .set(createAuthHeader());
        
        expect(getRes.status).toBe(200);
        expect(getRes.body.resume.title).toBe(resumeData.title);
      }
    });

    it('should create resume with minimal data (using generated resume defaults)', async () => {
      const resume = validResumes[0];
      const { _meta, ...resumeData } = resume;
      
      const res = await request(app)
        .post('/api/resumes/create')
        .set(createAuthHeader())
        .send({ title: resumeData.title });

      expect(res.status).toBe(201);
      expect(res.body.resume.title).toBe(resumeData.title);
      expect(res.body.resume.template).toBe('classic');
      expect(res.body.resume.accent_color).toBe('#3B82F6');
    });

    it('should reject create without authentication', async () => {
      const resume = validResumes[0];
      
      const res = await request(app)
        .post('/api/resumes/create')
        .send({ title: resume.title });

      expect(res.status).toBe(401);
    });
  });

  describe('READ - Using Generated Resumes', () => {
    it('should retrieve resume by ID for owner', async () => {
      const resume = validResumes[0];
      const { _meta, ...resumeData } = resume;
      
      const created = await Resume.create({ ...resumeData, userId: TEST_USER_ID });
      
      const res = await request(app)
        .get(`/api/resumes/get/${created._id}`)
        .set(createAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.resume).toBeDefined();
      expect(res.body.resume.title).toBe(resumeData.title);
      expect(res.body.resume.__v).toBeUndefined();
    });

    it('should return 404 for non-existent resume', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const res = await request(app)
        .get(`/api/resumes/get/${fakeId}`)
        .set(createAuthHeader());

      expect(res.status).toBe(404);
    });

    it('should return 404 for resume owned by different user', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      const resume = validResumes[0];
      const { _meta, ...resumeData } = resume;
      
      const created = await Resume.create({ ...resumeData, userId: otherUserId });
      
      const res = await request(app)
        .get(`/api/resumes/get/${created._id}`)
        .set(createAuthHeader());

      expect(res.status).toBe(404);
    });

    it('should return public resume without authentication', async () => {
      const resume = validResumes[0];
      const { _meta, ...resumeData } = resume;
      
      const created = await Resume.create({ ...resumeData, userId: TEST_USER_ID, public: true });
      
      const res = await request(app)
        .get(`/api/resumes/public/${created._id}`);

      expect(res.status).toBe(200);
      expect(res.body.resume).toBeDefined();
      expect(res.body.resume.title).toBe(resumeData.title);
    });

    it('should return 404 for private resume on public endpoint', async () => {
      const resume = validResumes[0];
      const { _meta, ...resumeData } = resume;
      
      const created = await Resume.create({ ...resumeData, userId: TEST_USER_ID, public: false });
      
      const res = await request(app)
        .get(`/api/resumes/public/${created._id}`);

      expect(res.status).toBe(404);
    });
  });

  describe('UPDATE - Using Generated Resumes', () => {
    it('should update resume fields', async () => {
      const resume = validResumes[0];
      const { _meta, ...resumeData } = resume;
      
      const created = await Resume.create({ ...resumeData, userId: TEST_USER_ID });
      
      const updateData = {
        title: 'Updated Resume Title',
        professional_summary: 'Updated professional summary',
        skills: ['TypeScript', 'React', 'Node.js', 'GraphQL'],
        template: 'modern',
        accent_color: '#EF4444',
      };

      const res = await request(app)
        .put('/api/resumes/update')
        .set(createAuthHeader())
        .send({ resumeId: created._id, resumeData: updateData });

      expect(res.status).toBe(200);
      expect(res.body.resume.title).toBe('Updated Resume Title');
      expect(res.body.resume.professional_summary).toBe('Updated professional summary');
      expect(res.body.resume.skills).toEqual(['TypeScript', 'React', 'Node.js', 'GraphQL']);
      expect(res.body.resume.template).toBe('modern');
      expect(res.body.resume.accent_color).toBe('#EF4444');
    });

    it('should update nested objects (personal_info, experience, etc.)', async () => {
      const resume = validResumes[0];
      const { _meta, ...resumeData } = resume;
      
      const created = await Resume.create({ ...resumeData, userId: TEST_USER_ID });
      
      const updateData = {
        personal_info: {
          full_name: 'Updated Name',
          profession: 'Senior DevOps Engineer',
          email: 'updated@example.com',
          phone: '555-999-9999',
          location: 'Remote',
          linkedin: 'linkedin.com/in/updated',
          website: 'updated.dev',
        },
        experience: [
          {
            company: 'New Company',
            position: 'Lead DevOps Engineer',
            start_date: '2023-01',
            end_date: 'Present',
            description: 'Leading platform team',
            is_current: true,
          },
        ],
        project: [
          {
            name: 'New Project',
            type: 'Production System',
            description: 'Built a new platform',
          },
        ],
        education: [
          {
            institution: 'New University',
            degree: 'PhD in Computer Science',
            field: 'Distributed Systems',
            graduation_date: '2025-06',
            gpa: '4.0',
          },
        ],
      };

      const res = await request(app)
        .put('/api/resumes/update')
        .set(createAuthHeader())
        .send({ resumeId: created._id, resumeData: updateData });

      expect(res.status).toBe(200);
      expect(res.body.resume.personal_info.full_name).toBe('Updated Name');
      expect(res.body.resume.personal_info.profession).toBe('Senior DevOps Engineer');
      expect(res.body.resume.experience).toHaveLength(1);
      expect(res.body.resume.experience[0].company).toBe('New Company');
      expect(res.body.resume.project).toHaveLength(1);
      expect(res.body.resume.education).toHaveLength(1);
    });

    it('should reject update for non-existent resume', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const res = await request(app)
        .put('/api/resumes/update')
        .set(createAuthHeader())
        .send({ resumeId: fakeId, resumeData: { title: 'Test' } });

      expect(res.status).toBe(200);
      expect(res.body.resume).toBeNull();
    });

    it('should reject update without authentication', async () => {
      const resume = validResumes[0];
      const { _meta, ...resumeData } = resume;
      
      const created = await Resume.create({ ...resumeData, userId: TEST_USER_ID });
      
      const res = await request(app)
        .put('/api/resumes/update')
        .send({ resumeId: created._id, resumeData: { title: 'Test' } });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE - Using Generated Resumes', () => {
    it('should delete resume for owner', async () => {
      const resume = validResumes[0];
      const { _meta, ...resumeData } = resume;
      
      const created = await Resume.create({ ...resumeData, userId: TEST_USER_ID });
      
      const res = await request(app)
        .delete(`/api/resumes/delete/${created._id}`)
        .set(createAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Resume deleted successfully');

      const deleted = await Resume.findById(created._id);
      expect(deleted).toBeNull();
    });

    it('should not delete resume owned by different user', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      const resume = validResumes[0];
      const { _meta, ...resumeData } = resume;
      
      const created = await Resume.create({ ...resumeData, userId: otherUserId });
      
      const res = await request(app)
        .delete(`/api/resumes/delete/${created._id}`)
        .set(createAuthHeader());

      expect(res.status).toBe(200);
      const stillExists = await Resume.findById(created._id);
      expect(stillExists).not.toBeNull();
    });

    it('should reject delete without authentication', async () => {
      const resume = validResumes[0];
      const { _meta, ...resumeData } = resume;
      
      const created = await Resume.create({ ...resumeData, userId: TEST_USER_ID });
      
      const res = await request(app)
        .delete(`/api/resumes/delete/${created._id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('EDGE CASES - Using Generated Resumes', () => {
    it('should handle resumes with empty optional arrays', async () => {
      const noProjectsResume = validResumes.find(r => r._meta.completeness === 'no-projects');
      expect(noProjectsResume).toBeDefined();
      
      const { _meta, ...resumeData } = noProjectsResume!;
      
      const res = await request(app)
        .post('/api/resumes/create')
        .set(createAuthHeader())
        .send({ 
          title: resumeData.title,
          template: resumeData.template,
          accent_color: resumeData.accent_color,
          professional_summary: resumeData.professional_summary,
          skills: resumeData.skills,
          personal_info: resumeData.personal_info,
          experience: resumeData.experience,
          project: resumeData.project,
          education: resumeData.education,
          public: resumeData.public,
        });

      expect(res.status).toBe(201);
      expect(res.body.resume.project).toEqual([]);
    });

    it('should handle resumes with no professional summary', async () => {
      const noSummaryResume = validResumes.find(r => r._meta.completeness === 'no-summary');
      expect(noSummaryResume).toBeDefined();
      
      const { _meta, ...resumeData } = noSummaryResume!;
      
      const res = await request(app)
        .post('/api/resumes/create')
        .set(createAuthHeader())
        .send({ 
          title: resumeData.title,
          template: resumeData.template,
          accent_color: resumeData.accent_color,
          professional_summary: resumeData.professional_summary,
          skills: resumeData.skills,
          personal_info: resumeData.personal_info,
          experience: resumeData.experience,
          project: resumeData.project,
          education: resumeData.education,
          public: resumeData.public,
        });

      expect(res.status).toBe(201);
      expect(res.body.resume.professional_summary).toBe('');
    });

    it('should handle resumes with no education', async () => {
      const noEduResume = validResumes.find(r => r._meta.completeness === 'no-education');
      expect(noEduResume).toBeDefined();
      
      const { _meta, ...resumeData } = noEduResume!;
      
      const res = await request(app)
        .post('/api/resumes/create')
        .set(createAuthHeader())
        .send({ 
          title: resumeData.title,
          template: resumeData.template,
          accent_color: resumeData.accent_color,
          professional_summary: resumeData.professional_summary,
          skills: resumeData.skills,
          personal_info: resumeData.personal_info,
          experience: resumeData.experience,
          project: resumeData.project,
          education: resumeData.education,
          public: resumeData.public,
        });

      expect(res.status).toBe(201);
      expect(res.body.resume.education).toEqual([]);
    });

    it('should handle minimal resumes (minimal completeness)', async () => {
      const minimalResume = validResumes.find(r => r._meta.completeness === 'minimal');
      expect(minimalResume).toBeDefined();
      
      const { _meta, ...resumeData } = minimalResume!;
      
      const res = await request(app)
        .post('/api/resumes/create')
        .set(createAuthHeader())
        .send({ 
          title: resumeData.title,
          template: resumeData.template,
          accent_color: resumeData.accent_color,
          professional_summary: resumeData.professional_summary,
          skills: resumeData.skills,
          personal_info: resumeData.personal_info,
          experience: resumeData.experience,
          project: resumeData.project,
          education: resumeData.education,
          public: resumeData.public,
        });

      expect(res.status).toBe(201);
      expect(res.body.resume.project).toEqual([]);
      expect(res.body.resume.education.length).toBeLessThanOrEqual(1);
    });

    it('should handle malformed ObjectId in GET request', async () => {
      const res = await request(app)
        .get('/api/resumes/get/not-a-valid-id')
        .set(createAuthHeader());

      expect(res.status).toBe(400);
    });

    it('should handle malformed ObjectId in DELETE request', async () => {
      const res = await request(app)
        .delete('/api/resumes/delete/not-a-valid-id')
        .set(createAuthHeader());

      expect(res.status).toBe(400);
    });
  });

  describe('VARIED PROFILES - Using Different Generated Resumes', () => {
    let testResumes: any[];
    
    beforeAll(() => {
      // Get one resume from each profession (first 5)
      const professions = ['DevOps Engineer', 'Product Manager', 'UX/UI Designer', 'Frontend Engineer', 'Backend Engineer'];
      testResumes = professions.map(profession => 
        validResumes.find(r => r._meta?.profession === profession)
      ).filter(Boolean);
    });

    it('should handle CRUD cycle for each profession', async () => {
      for (const resume of testResumes) {
        const { _meta, ...resumeData } = resume;
        
        // CREATE
        const createRes = await request(app)
          .post('/api/resumes/create')
          .set(createAuthHeader())
          .send({ 
            title: resumeData.title,
            template: resumeData.template,
            accent_color: resumeData.accent_color,
            professional_summary: resumeData.professional_summary,
            skills: resumeData.skills,
            personal_info: resumeData.personal_info,
            experience: resumeData.experience,
            project: resumeData.project,
            education: resumeData.education,
            public: resumeData.public,
          });
        
        expect(createRes.status).toBe(201);
        const resumeId = createRes.body.resume._id;
        
        // READ
        const readRes = await request(app)
          .get(`/api/resumes/get/${resumeId}`)
          .set(createAuthHeader());
        
        expect(readRes.status).toBe(200);
        expect(readRes.body.resume.title).toBe(resumeData.title);
        
        // UPDATE
        const updateRes = await request(app)
          .put('/api/resumes/update')
          .set(createAuthHeader())
          .send({ 
            resumeId, 
            resumeData: { 
              title: `${resumeData.title} - Updated`,
              professional_summary: 'Updated summary for ' + resume._meta.profession
            } 
          });
        
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.resume.title).toBe(`${resumeData.title} - Updated`);
        
        // DELETE
        const deleteRes = await request(app)
          .delete(`/api/resumes/delete/${resumeId}`)
          .set(createAuthHeader());
        
        expect(deleteRes.status).toBe(200);
        
        // Verify deleted
        const verifyRes = await request(app)
          .get(`/api/resumes/get/${resumeId}`)
          .set(createAuthHeader());
        
        expect(verifyRes.status).toBe(404);
      }
    });
  });

  describe('BULK OPERATIONS - Multiple Generated Resumes', () => {
    it('should create and retrieve multiple resumes', async () => {
      const testResumes = validResumes.slice(0, 20);
      const createdIds: string[] = [];
      
      // Create 20 resumes
      for (const resume of testResumes) {
        const { _meta, ...resumeData } = resume;
        
        const res = await request(app)
          .post('/api/resumes/create')
          .set(createAuthHeader())
          .send({ 
            title: resumeData.title,
            template: resumeData.template,
            accent_color: resumeData.accent_color,
            professional_summary: resumeData.professional_summary,
            skills: resumeData.skills,
            personal_info: resumeData.personal_info,
            experience: resumeData.experience,
            project: resumeData.project,
            education: resumeData.education,
            public: resumeData.public,
          });
        
        expect(res.status).toBe(201);
        createdIds.push(res.body.resume._id);
      }
      
      // Verify all can be retrieved
      for (const id of createdIds) {
        const res = await request(app)
          .get(`/api/resumes/get/${id}`)
          .set(createAuthHeader());
        
        expect(res.status).toBe(200);
        expect(res.body.resume).toBeDefined();
      }
      
      // Verify count in database
      const count = await Resume.countDocuments({ userId: TEST_USER_ID });
      expect(count).toBe(20);
    });

    it('should create 100 resumes and verify all persist', async () => {
      const testResumes = validResumes.slice(0, 100);
      const createdIds: string[] = [];
      
      for (const resume of testResumes) {
        const { _meta, ...resumeData } = resume;
        
        const res = await request(app)
          .post('/api/resumes/create')
          .set(createAuthHeader())
          .send({ 
            title: resumeData.title,
            template: resumeData.template,
            accent_color: resumeData.accent_color,
            professional_summary: resumeData.professional_summary,
            skills: resumeData.skills,
            personal_info: resumeData.personal_info,
            experience: resumeData.experience,
            project: resumeData.project,
            education: resumeData.education,
            public: resumeData.public,
          });
        
        expect(res.status).toBe(201);
        createdIds.push(res.body.resume._id);
      }
      
      const count = await Resume.countDocuments({ userId: TEST_USER_ID });
      expect(count).toBe(100);
    });
  });

  describe('FULL DATASET - All 1000 Resumes Persistence', () => {
    it('should create all 1000 resumes and verify all persist', async () => {
      const testResumes = validResumes.slice(0, 1000);
      const createdIds: string[] = [];
      const startTime = Date.now();
      
      // Create all 1000 resumes
      for (let i = 0; i < testResumes.length; i++) {
        const resume = testResumes[i];
        const { _meta, ...resumeData } = resume;
        
        const res = await request(app)
          .post('/api/resumes/create')
          .set(createAuthHeader())
          .send({ 
            title: resumeData.title,
            template: resumeData.template,
            accent_color: resumeData.accent_color,
            professional_summary: resumeData.professional_summary,
            skills: resumeData.skills,
            personal_info: resumeData.personal_info,
            experience: resumeData.experience,
            project: resumeData.project,
            education: resumeData.education,
            public: resumeData.public,
          });
        
        expect(res.status).toBe(201);
        createdIds.push(res.body.resume._id);
        
        // Log progress every 100 resumes
        if ((i + 1) % 100 === 0) {
          console.log(`Created ${i + 1}/1000 resumes...`);
        }
      }
      
      const createTime = Date.now() - startTime;
      console.log(`\nCreated 1000 resumes in ${createTime}ms`);
      
      // Verify count in database
      const count = await Resume.countDocuments({ userId: TEST_USER_ID });
      expect(count).toBe(1000);
      
      // Verify all can be retrieved
      const readStartTime = Date.now();
      for (const id of createdIds) {
        const res = await request(app)
          .get(`/api/resumes/get/${id}`)
          .set(createAuthHeader());
        
        expect(res.status).toBe(200);
        expect(res.body.resume).toBeDefined();
      }
      
      const readTime = Date.now() - readStartTime;
      console.log(`Retrieved 1000 resumes in ${readTime}ms`);
      console.log(`Total round-trip time: ${createTime + readTime}ms`);
    }, 300000); // 5 minute timeout for this test
  });
});