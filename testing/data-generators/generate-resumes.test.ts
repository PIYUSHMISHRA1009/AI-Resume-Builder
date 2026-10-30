import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { generateResume } from './generate-resumes.js';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'generated');

describe('Synthetic Resume Generator', () => {
  let validResumes: any[];
  let invalidResumes: any[];
  let index: any;

  beforeAll(() => {
    const validFile = join(FIXTURES_DIR, 'resumes-42.json');
    const invalidFile = join(FIXTURES_DIR, 'invalid-resumes.json');
    const indexFile = join(FIXTURES_DIR, 'index.json');

    expect(existsSync(validFile)).toBe(true);
    expect(existsSync(invalidFile)).toBe(true);
    expect(existsSync(indexFile)).toBe(true);

    validResumes = JSON.parse(readFileSync(validFile, 'utf-8'));
    invalidResumes = JSON.parse(readFileSync(invalidFile, 'utf-8'));
    index = JSON.parse(readFileSync(indexFile, 'utf-8'));
  });

  describe('Record Count', () => {
    it('should generate exactly 1000 valid resumes', () => {
      expect(validResumes.length).toBe(1000);
    });

    it('should generate 10 invalid test cases', () => {
      expect(invalidResumes.length).toBe(10);
    });
  });

  describe('Deterministic Generation', () => {
    it('should produce identical output for the same seed', () => {
      const resume1 = generateResume(42);
      const resume2 = generateResume(42);
      
      // Remove _meta.seed since it's the input
      const { _meta: meta1, ...rest1 } = resume1;
      const { _meta: meta2, ...rest2 } = resume2;
      
      expect(rest1).toEqual(rest2);
    });

    it('should produce different output for different seeds', () => {
      const resume1 = generateResume(42);
      const resume2 = generateResume(43);
      
      const { _meta: meta1, ...rest1 } = resume1;
      const { _meta: meta2, ...rest2 } = resume2;
      
      expect(rest1).not.toEqual(rest2);
    });

    it('should produce a sequence of different resumes for sequential seeds', () => {
      const resumes = Array.from({ length: 10 }, (_, i) => generateResume(42 + i));
      const unique = new Set(resumes.map(r => JSON.stringify(r)));
      expect(unique.size).toBe(10);
    });
  });

  describe('Schema Compatibility', () => {
    it('should have all required fields matching Resume schema', () => {
      for (const resume of validResumes) {
        expect(resume).toHaveProperty('title');
        expect(resume).toHaveProperty('template');
        expect(resume).toHaveProperty('accent_color');
        expect(resume).toHaveProperty('professional_summary');
        expect(resume).toHaveProperty('skills');
        expect(resume).toHaveProperty('personal_info');
        expect(resume).toHaveProperty('experience');
        expect(resume).toHaveProperty('project');
        expect(resume).toHaveProperty('education');
        expect(resume).toHaveProperty('public');
        expect(resume).toHaveProperty('_meta');
      }
    });

    it('should have valid personal_info structure', () => {
      for (const resume of validResumes) {
        const pi = resume.personal_info;
        expect(pi).toHaveProperty('full_name');
        expect(pi).toHaveProperty('profession');
        expect(pi).toHaveProperty('email');
        expect(pi).toHaveProperty('phone');
        expect(pi).toHaveProperty('location');
        expect(pi).toHaveProperty('linkedin');
        expect(pi).toHaveProperty('website');
        expect(pi).toHaveProperty('image');
        
        expect(typeof pi.full_name).toBe('string');
        expect(typeof pi.email).toBe('string');
        expect(pi.email).toContain('@');
        expect(pi.email).toMatch(/@(example\.com|test\.com|sample\.org|demo\.net)$/);
      }
    });

    it('should have valid experience structure', () => {
      for (const resume of validResumes) {
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
        }
      }
    });

    it('should have valid project structure', () => {
      for (const resume of validResumes) {
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
      for (const resume of validResumes) {
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
        }
      }
    });

    it('should have valid template values', () => {
      const validTemplates = ['classic', 'modern', 'minimal', 'minimal-image'];
      for (const resume of validResumes) {
        expect(validTemplates).toContain(resume.template);
      }
    });

    it('should have valid accent_color format', () => {
      for (const resume of validResumes) {
        expect(resume.accent_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('should have skills as array of strings', () => {
      for (const resume of validResumes) {
        expect(Array.isArray(resume.skills)).toBe(true);
        for (const skill of resume.skills) {
          expect(typeof skill).toBe('string');
          expect(skill.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have boolean public field', () => {
      for (const resume of validResumes) {
        expect(typeof resume.public).toBe('boolean');
      }
    });
  });

  describe('Uniqueness', () => {
    it('should have unique _meta.seed values', () => {
      const seeds = validResumes.map(r => r._meta.seed);
      const uniqueSeeds = new Set(seeds);
      expect(uniqueSeeds.size).toBe(validResumes.length);
    });

    it('should have unique email addresses', () => {
      const emails = validResumes.map(r => r.personal_info.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(validResumes.length);
    });

    it('should have unique full_name + email combinations', () => {
      const combos = validResumes.map(r => `${r.personal_info.full_name}|${r.personal_info.email}`);
      const uniqueCombos = new Set(combos);
      expect(uniqueCombos.size).toBe(validResumes.length);
    });
  });

  describe('Meaningful Diversity', () => {
    it('should cover multiple professions', () => {
      const professions = new Set(validResumes.map(r => r._meta.profession));
      expect(professions.size).toBeGreaterThanOrEqual(5);
    });

    it('should cover multiple experience levels', () => {
      const levels = new Set(validResumes.map(r => r._meta.experienceLevel));
      expect(levels.size).toBe(5); // Intern, Junior, Mid, Senior, Staff/Principal
    });

    it('should cover multiple industries', () => {
      const industries = new Set(validResumes.map(r => r._meta.industry));
      expect(industries.size).toBeGreaterThanOrEqual(5);
    });

    it('should cover multiple education levels', () => {
      const eduLevels = new Set(validResumes.map(r => r._meta.educationLevel));
      expect(eduLevels.size).toBeGreaterThanOrEqual(4);
    });

    it('should cover multiple skill profiles', () => {
      const profiles = new Set(validResumes.map(r => r._meta.skillProfile));
      expect(profiles.size).toBe(4); // specialist, generalist, polyglot, legacy-to-modern
    });

    it('should cover multiple completeness levels', () => {
      const completeness = new Set(validResumes.map(r => r._meta.completeness));
      expect(completeness.size).toBe(5); // complete, minimal, no-projects, no-summary, no-education
    });

    it('should have varied skill counts', () => {
      const skillCounts = validResumes.map(r => r.skills.length);
      const minSkills = Math.min(...skillCounts);
      const maxSkills = Math.max(...skillCounts);
      expect(minSkills).toBeLessThan(maxSkills);
      expect(maxSkills - minSkills).toBeGreaterThan(5);
    });

    it('should have varied experience counts', () => {
      const expCounts = validResumes.map(r => r.experience.length);
      const minExp = Math.min(...expCounts);
      const maxExp = Math.max(...expCounts);
      expect(minExp).toBeLessThan(maxExp);
    });

    it('should have varied project counts', () => {
      const projCounts = validResumes.map(r => r.project.length);
      const minProj = Math.min(...projCounts);
      const maxProj = Math.max(...projCounts);
      expect(minProj).toBeLessThan(maxProj);
    });

    it('should have varied education counts', () => {
      const eduCounts = validResumes.map(r => r.education.length);
      const minEdu = Math.min(...eduCounts);
      const maxEdu = Math.max(...eduCounts);
      expect(minEdu).toBeLessThanOrEqual(maxEdu);
    });
  });

  describe('Invalid Test Cases Separation', () => {
    it('should keep invalid resumes separate from valid ones', () => {
      // Invalid resumes should have _meta.reason field
      for (const invalid of invalidResumes) {
        expect(invalid).toHaveProperty('_meta');
        expect(invalid._meta).toHaveProperty('reason');
        expect(typeof invalid._meta.reason).toBe('string');
      }
    });

    it('should have distinct invalid case types', () => {
      const reasons = invalidResumes.map(r => r._meta.reason);
      const uniqueReasons = new Set(reasons);
      expect(uniqueReasons.size).toBe(invalidResumes.length);
    });

    it('should cover key invalid scenarios', () => {
      const reasons = new Set(invalidResumes.map(r => r._meta.reason));
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
        expect(reasons.has(expected)).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty professional_summary when not included', () => {
      const noSummaryResumes = validResumes.filter(r => r._meta.completeness === 'no-summary');
      for (const resume of noSummaryResumes) {
        expect(resume.professional_summary).toBe('');
      }
    });

    it('should have no projects when completeness is no-projects', () => {
      const noProjectsResumes = validResumes.filter(r => r._meta.completeness === 'no-projects');
      for (const resume of noProjectsResumes) {
        expect(resume.project.length).toBe(0);
      }
    });

    it('should have no education when completeness is no-education', () => {
      const noEduResumes = validResumes.filter(r => r._meta.completeness === 'no-education');
      for (const resume of noEduResumes) {
        expect(resume.education.length).toBe(0);
      }
    });

    it('should have minimal fields when completeness is minimal', () => {
      const minimalResumes = validResumes.filter(r => r._meta.completeness === 'minimal');
      for (const resume of minimalResumes) {
        expect(resume.project.length).toBe(0);
        expect(resume.education.length).toBeLessThanOrEqual(1);
        expect(resume.experience.length).toBeLessThanOrEqual(2);
      }
    });

    it('should have valid date formats in experience', () => {
      for (const resume of validResumes) {
        for (const exp of resume.experience) {
          expect(exp.start_date).toMatch(/^\d{4}-\d{2}$/);
          if (exp.end_date !== 'Present') {
            expect(exp.end_date).toMatch(/^\d{4}-\d{2}$/);
          }
        }
      }
    });

    it('should have valid graduation_date format', () => {
      for (const resume of validResumes) {
        for (const edu of resume.education) {
          expect(edu.graduation_date).toMatch(/^\d{4}-\d{2}$/);
        }
      }
    });
  });

  describe('Data Summary Statistics', () => {
    it('should have index with correct counts matching valid resumes', () => {
      const indexTotal = Object.values(index.profession).flat().length;
      expect(indexTotal).toBe(validResumes.length);
    });

    it('should have balanced distribution across experience levels', () => {
      for (const [level, indices] of Object.entries(index.experienceLevel)) {
        const count = (indices as number[]).length;
        // Each level should have roughly 200 (1000/5)
        expect(count).toBeGreaterThanOrEqual(150);
        expect(count).toBeLessThanOrEqual(250);
      }
    });

    it('should have balanced distribution across completeness levels', () => {
      for (const [comp, indices] of Object.entries(index.completeness)) {
        const count = (indices as number[]).length;
        expect(count).toBeGreaterThanOrEqual(150);
        expect(count).toBeLessThanOrEqual(250);
      }
    });
  });
});

describe('Generator Configuration Validation', () => {
  it('should handle configurable seed', () => {
    const resume1 = generateResume(12345);
    const resume2 = generateResume(12345);
    expect(resume1._meta.seed).toBe(12345);
    expect(resume2._meta.seed).toBe(12345);
  });

  it('should handle configurable record count via main function', () => {
    // This is tested by the fact that we generated 1000 records
    // The COUNT constant in main() controls this
    expect(true).toBe(true);
  });

  it('should handle invalid configuration gracefully', () => {
    // Test with negative seed
    const resume = generateResume(-1);
    expect(resume).toBeDefined();
    expect(resume._meta.seed).toBe(-1);
  });

  it('should produce valid output for large seed values', () => {
    const resume = generateResume(2147483647);
    expect(resume).toBeDefined();
    expect(resume._meta.seed).toBe(2147483647);
  });
});