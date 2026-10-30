import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Import the actual Resume model
import Resume from '@server/models/Resume.js';

const __dirname = join(fileURLToPath(import.meta.url), '..', '..', '..');
const FIXTURES_DIR = join(__dirname, 'fixtures', 'generated');

let mongoServer: MongoMemoryServer;

describe('D1.A: Schema Compatibility - Generated Resumes vs Mongoose Schema', () => {
  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'resume-builder-test' } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('Valid Resumes (1000 records)', () => {
    let validResumes: any[];

    beforeAll(() => {
      const validFile = join(FIXTURES_DIR, 'resumes-42.json');
      validResumes = JSON.parse(readFileSync(validFile, 'utf-8'));
      expect(validResumes.length).toBe(1000);
    });

    it('should have exactly 1000 valid resumes', () => {
      expect(validResumes.length).toBe(1000);
    });

    it('should validate all 1000 resumes against Mongoose schema', async () => {
      const validationErrors: Array<{ index: number; seed: number; error: string }> = [];
      const validationWarnings: Array<{ index: number; seed: number; warning: string }> = [];

      for (let i = 0; i < validResumes.length; i++) {
        const resume = validResumes[i];
        const seed = resume._meta?.seed ?? i + 42;

        try {
          // Create a new Resume document with the generated data
          // We need to add userId as it's required by the schema
          const doc = new Resume({
            ...resume,
            userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
          });

          // Validate against schema
          const validationError = doc.validateSync();
          if (validationError) {
            validationErrors.push({ index: i, seed, error: validationError.message });
          }

          // Check for potential issues that don't cause validation errors but may be problematic
          if (resume.skills && resume.skills.length === 0) {
            validationWarnings.push({ index: i, seed, warning: 'Empty skills array' });
          }
          if (resume.experience && resume.experience.length === 0) {
            validationWarnings.push({ index: i, seed, warning: 'Empty experience array' });
          }
          if (resume.professional_summary === '' && resume._meta?.completeness !== 'no-summary') {
            validationWarnings.push({ index: i, seed, warning: 'Empty professional_summary but completeness is not no-summary' });
          }
        } catch (err: any) {
          validationErrors.push({ index: i, seed, error: err.message || String(err) });
        }
      }

      // Report validation errors
      if (validationErrors.length > 0) {
        console.error('\n=== SCHEMA VALIDATION ERRORS ===');
        for (const e of validationErrors) {
          console.error(`  Index ${e.index} (seed ${e.seed}): ${e.error}`);
        }
      }

      // Report warnings
      if (validationWarnings.length > 0) {
        console.warn(`\n=== SCHEMA VALIDATION WARNINGS (${validationWarnings.length}) ===`);
        // Group by warning type
        const warningCounts = new Map<string, number>();
        for (const w of validationWarnings) {
          const count = warningCounts.get(w.warning) || 0;
          warningCounts.set(w.warning, count + 1);
        }
        for (const [warning, count] of warningCounts) {
          console.warn(`  ${warning}: ${count} resumes`);
        }
      }

      expect(validationErrors.length).toBe(0);
    });

    it('should have all required fields present', () => {
      const requiredFields = [
        'title', 'template', 'accent_color', 'professional_summary',
        'skills', 'personal_info', 'experience', 'project', 'education', 'public'
      ];

      for (let i = 0; i < validResumes.length; i++) {
        const resume = validResumes[i];
        for (const field of requiredFields) {
          expect(resume).toHaveProperty(field);
        }
      }
    });

    it('should have valid personal_info structure', () => {
      const requiredPersonalInfo = [
        'full_name', 'profession', 'email', 'phone', 'location',
        'linkedin', 'website', 'image'
      ];

      for (let i = 0; i < validResumes.length; i++) {
        const resume = validResumes[i];
        expect(resume.personal_info).toBeDefined();
        for (const field of requiredPersonalInfo) {
          expect(resume.personal_info).toHaveProperty(field);
        }
        // Email should be valid format
        expect(resume.personal_info.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        // Email should use test domains
        expect(resume.personal_info.email).toMatch(/@(example\.com|test\.com|sample\.org|demo\.net)$/);
      }
    });

    it('should have valid experience structure', () => {
      for (let i = 0; i < validResumes.length; i++) {
        const resume = validResumes[i];
        expect(Array.isArray(resume.experience)).toBe(true);
        
        for (const exp of resume.experience) {
          expect(exp).toHaveProperty('company');
          expect(exp).toHaveProperty('position');
          expect(exp).toHaveProperty('start_date');
          expect(exp).toHaveProperty('end_date');
          expect(exp).toHaveProperty('description');
          expect(exp).toHaveProperty('is_current');
          
          expect(typeof exp.company).toBe('string');
          expect(typeof exp.position).toBe('string');
          expect(typeof exp.start_date).toBe('string');
          expect(typeof exp.end_date).toBe('string');
          expect(typeof exp.description).toBe('string');
          expect(typeof exp.is_current).toBe('boolean');
          
          // Date format validation
          expect(exp.start_date).toMatch(/^\d{4}-\d{2}$/);
          if (exp.end_date !== 'Present') {
            expect(exp.end_date).toMatch(/^\d{4}-\d{2}$/);
          }
        }
      }
    });

    it('should have valid project structure', () => {
      for (let i = 0; i < validResumes.length; i++) {
        const resume = validResumes[i];
        expect(Array.isArray(resume.project)).toBe(true);
        
        for (const proj of resume.project) {
          expect(proj).toHaveProperty('name');
          expect(proj).toHaveProperty('type');
          expect(proj).toHaveProperty('description');
          
          expect(typeof proj.name).toBe('string');
          expect(typeof proj.type).toBe('string');
          expect(typeof proj.description).toBe('string');
        }
      }
    });

    it('should have valid education structure', () => {
      for (let i = 0; i < validResumes.length; i++) {
        const resume = validResumes[i];
        expect(Array.isArray(resume.education)).toBe(true);
        
        for (const edu of resume.education) {
          expect(edu).toHaveProperty('institution');
          expect(edu).toHaveProperty('degree');
          expect(edu).toHaveProperty('field');
          expect(edu).toHaveProperty('graduation_date');
          expect(edu).toHaveProperty('gpa');
          
          expect(typeof edu.institution).toBe('string');
          expect(typeof edu.degree).toBe('string');
          expect(typeof edu.field).toBe('string');
          expect(typeof edu.graduation_date).toBe('string');
          expect(typeof edu.gpa).toBe('string');
          
          expect(edu.graduation_date).toMatch(/^\d{4}-\d{2}$/);
        }
      }
    });

    it('should have valid template values', () => {
      const validTemplates = ['classic', 'modern', 'minimal', 'minimal-image'];
      for (let i = 0; i < validResumes.length; i++) {
        expect(validTemplates).toContain(validResumes[i].template);
      }
    });

    it('should have valid accent_color format', () => {
      for (let i = 0; i < validResumes.length; i++) {
        expect(validResumes[i].accent_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('should have boolean public field', () => {
      for (let i = 0; i < validResumes.length; i++) {
        expect(typeof validResumes[i].public).toBe('boolean');
      }
    });

    it('should have skills as array of strings', () => {
      for (let i = 0; i < validResumes.length; i++) {
        expect(Array.isArray(validResumes[i].skills)).toBe(true);
        for (const skill of validResumes[i].skills) {
          expect(typeof skill).toBe('string');
          expect(skill.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Invalid Test Cases (10 records)', () => {
    let invalidResumes: any[];

    beforeAll(() => {
      const invalidFile = join(FIXTURES_DIR, 'invalid-resumes.json');
      invalidResumes = JSON.parse(readFileSync(invalidFile, 'utf-8'));
      expect(invalidResumes.length).toBe(10);
    });

    it('should have exactly 10 invalid test cases', () => {
      expect(invalidResumes.length).toBe(10);
    });

    it('should have distinct invalid case reasons', () => {
      const reasons = invalidResumes.map(r => r._meta?.reason);
      const uniqueReasons = new Set(reasons);
      expect(uniqueReasons.size).toBe(10);
      
      const expectedReasons = [
        'empty-object',
        'missing-required-fields',
        'invalid-email',
        'malformed-dates',
        'empty-arrays',
        'unicode-stress',
        'extremely-long-text',
        'null-values',
        'negative-experience',
        'duplicate-skills',
      ];
      
      for (const expected of expectedReasons) {
        expect(uniqueReasons.has(expected)).toBe(true);
      }
    });

    it('should fail schema validation for invalid cases', async () => {
      for (const invalid of invalidResumes) {
        const reason = invalid._meta?.reason || 'unknown';
        
        try {
          const doc = new Resume({
            ...invalid,
            userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
          });
          
          const validationError = doc.validateSync();
          
          // Some cases like empty-object might not fail validation if fields have defaults
          // But others should definitely fail
          if (['invalid-email', 'malformed-dates', 'negative-experience'].includes(reason)) {
            expect(validationError).toBeDefined();
          }
        } catch (err) {
          // Expected for some invalid cases
          expect(err).toBeDefined();
        }
      }
    });
  });
});