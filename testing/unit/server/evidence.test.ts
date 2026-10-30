import { describe, it, expect } from 'vitest';
import { extractSkillEvidence, extractAllSkillEvidences } from '@server/services/evidenceService.js';

const mockResume = {
  skills: ['Python', 'SQL', 'Power BI'],
  experience: [
    {
      company: 'Analytics Corp',
      position: 'Data Analyst',
      description: 'Optimized PostgreSQL queries, reducing latency by 45%\nBuilt automated ETL pipelines',
    },
  ],
  project: [
    {
      name: 'Sentinel Analytics',
      type: 'Data Analytics',
      description: 'Developed machine learning model with 92% accuracy in Python',
    },
  ],
  education: [
    { degree: 'Bachelor of Technology', institution: 'IIT' }
  ],
  professional_summary: 'Data analyst with Python and SQL expertise',
};

describe('Evidence Extraction Engine', () => {
  describe('extractSkillEvidence', () => {
    it('should find Strong evidence in experience with metrics', () => {
      const result = extractSkillEvidence('PostgreSQL', mockResume);
      expect(result.status).toBe('MATCHED');
      expect(result.evidenceStrength).toBe('Strong');
      expect(result.evidenceSource).toBe('experience');
      expect(result.evidenceQuote).toContain('PostgreSQL');
      expect(result.evidenceQuote).toContain('45%');
    });

    it('should find Strong evidence in project with metrics', () => {
      const result = extractSkillEvidence('Python', mockResume);
      expect(result.status).toBe('MATCHED');
      expect(result.evidenceStrength).toBe('Strong');
      expect(result.evidenceSource).toBe('project');
      expect(result.evidenceQuote).toContain('92%');
    });

    it('should find Strong evidence in experience with action verbs', () => {
      const resumeWithActionVerb = {
        ...mockResume,
        experience: [
          {
            company: 'Test Corp',
            position: 'Developer',
            description: 'Developed Python applications for data processing',
          },
        ],
      };
      const result = extractSkillEvidence('Python', resumeWithActionVerb);
      expect(result.status).toBe('MATCHED');
      expect(result.evidenceStrength).toBe('Strong'); // "Developed" matches action verb regex
      expect(result.evidenceSource).toBe('experience');
    });

    it('should find Moderate evidence in professional summary', () => {
      // Create a resume with NO experience/projects mentioning SQL, only summary
      const resumeWithOnlySummary = {
        skills: ['Python'],
        experience: [
          {
            company: 'Test Corp',
            position: 'Developer',
            description: 'Worked on various projects', // No SQL mention
          },
        ],
        project: [],
        education: [],
        professional_summary: 'Data analyst with Python and SQL expertise',
      };
      const result = extractSkillEvidence('SQL', resumeWithOnlySummary);
      expect(result.status).toBe('MATCHED');
      expect(result.evidenceStrength).toBe('Moderate');
      expect(result.evidenceSource).toBe('summary');
    });

    it('should find Weak evidence when only in skills list', () => {
      const result = extractSkillEvidence('Power BI', mockResume);
      expect(result.status).toBe('PARTIAL');
      expect(result.evidenceStrength).toBe('Weak');
      expect(result.evidenceSource).toBe('skills_list');
    });

    it('should return MISSING for skill not in resume', () => {
      const result = extractSkillEvidence('Docker', mockResume);
      expect(result.status).toBe('MISSING');
      expect(result.evidenceStrength).toBe('None');
      expect(result.evidenceSource).toBe('none');
    });

    it('should return MISSING for null resume', () => {
      const result = extractSkillEvidence('Python', null as any);
      expect(result.status).toBe('MISSING');
      expect(result.evidenceStrength).toBe('None');
    });

    it('should handle case-insensitive matching', () => {
      const result = extractSkillEvidence('postgresql', mockResume);
      expect(result.status).toBe('MATCHED');
    });
  });

  describe('extractAllSkillEvidences', () => {
    it('should extract evidence for multiple skills', () => {
      const skills = ['PostgreSQL', 'Python', 'Power BI', 'Docker'];
      const results = extractAllSkillEvidences(skills, mockResume);
      expect(results.length).toBe(4);
      expect(results[0].status).toBe('MATCHED');
      expect(results[1].status).toBe('MATCHED');
      expect(results[2].status).toBe('PARTIAL');
      expect(results[3].status).toBe('MISSING');
    });

    it('should return empty array for non-array input', () => {
      expect(extractAllSkillEvidences(null as any, mockResume)).toEqual([]);
      expect(extractAllSkillEvidences('not-array' as any, mockResume)).toEqual([]);
    });

    it('should handle empty skills array', () => {
      expect(extractAllSkillEvidences([], mockResume)).toEqual([]);
    });
  });
});