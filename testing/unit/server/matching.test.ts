import { describe, it, expect } from 'vitest';
import { calculateCandidateJDMatch, DEFAULT_WEIGHTS } from '@server/services/matchingService.js';

const mockResume = {
  skills: ['Python', 'SQL', 'Power BI', 'PostgreSQL', 'ETL'],
  experience: [
    {
      company: 'Analytics Corp',
      position: 'Data Analyst',
      description: 'Optimized PostgreSQL queries, reducing latency by 45%\nBuilt automated ETL pipelines',
    },
    {
      company: 'Data Inc',
      position: 'Junior Analyst',
      description: 'Created Power BI dashboards\nWrote SQL queries for reporting',
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
  professional_summary: 'Data analyst with 3 years experience in Python, SQL, and Power BI',
};

const mockJD = {
  title: 'Business Technology Solutions Associate',
  category: 'Business Technology',
  extractedRequirements: {
    technicalSkills: ['PostgreSQL', 'Python', 'ETL'],
    tools: ['Power BI'],
    softSkills: ['Problem Solving', 'Communication'],
    experienceYears: 2,
    educationLevel: 'Bachelor',
  },
};

describe('Deterministic Matching Engine', () => {
  describe('calculateCandidateJDMatch', () => {
    it('should return overall score between 0 and 100', () => {
      const result = calculateCandidateJDMatch(mockResume, mockJD);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should return all breakdown scores', () => {
      const result = calculateCandidateJDMatch(mockResume, mockJD);
      expect(result.breakdownScores.technicalScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdownScores.softSkillScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdownScores.experienceScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdownScores.projectScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdownScores.educationScore).toBeGreaterThanOrEqual(0);
    });

    it('should use default weights when not provided', () => {
      const result = calculateCandidateJDMatch(mockResume, mockJD);
      expect(result.weightsUsed.wTech).toBe(DEFAULT_WEIGHTS.wTech);
      expect(result.weightsUsed.wSoft).toBe(DEFAULT_WEIGHTS.wSoft);
      expect(result.weightsUsed.wExp).toBe(DEFAULT_WEIGHTS.wExp);
      expect(result.weightsUsed.wProj).toBe(DEFAULT_WEIGHTS.wProj);
      expect(result.weightsUsed.wEdu).toBe(DEFAULT_WEIGHTS.wEdu);
    });

    it('should allow custom weights override', () => {
      const customWeights = { wTech: 0.5, wSoft: 0.1, wExp: 0.2, wProj: 0.1, wEdu: 0.1 };
      const result = calculateCandidateJDMatch(mockResume, mockJD, customWeights);
      expect(result.weightsUsed.wTech).toBe(0.5);
      expect(result.weightsUsed.wSoft).toBe(0.1);
    });

    it('should count matched, partial, and missing skills', () => {
      const result = calculateCandidateJDMatch(mockResume, mockJD);
      expect(result.matchedSkillsCount).toBeGreaterThanOrEqual(0);
      expect(result.partialSkillsCount).toBeGreaterThanOrEqual(0);
      expect(result.missingSkillsCount).toBeGreaterThanOrEqual(0);
      expect(result.matchedSkillsCount + result.partialSkillsCount + result.missingSkillsCount).toBeGreaterThan(0);
    });

    it('should include skill evidences with all required fields', () => {
      const result = calculateCandidateJDMatch(mockResume, mockJD);
      expect(result.skillEvidences.length).toBeGreaterThan(0);
      for (const ev of result.skillEvidences) {
        expect(ev).toHaveProperty('skill');
        expect(ev).toHaveProperty('canonicalSkill');
        expect(ev).toHaveProperty('category');
        expect(ev).toHaveProperty('status');
        expect(ev).toHaveProperty('evidenceQuote');
        expect(ev).toHaveProperty('evidenceSource');
        expect(ev).toHaveProperty('evidenceStrength');
        expect(ev).toHaveProperty('rationale');
        expect(['MATCHED', 'PARTIAL', 'MISSING']).toContain(ev.status);
        expect(['Strong', 'Moderate', 'Weak', 'None']).toContain(ev.evidenceStrength);
      }
    });

    it('should handle empty requirements gracefully', () => {
      const emptyJD = { ...mockJD, extractedRequirements: {} };
      const result = calculateCandidateJDMatch(mockResume, emptyJD);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdownScores.technicalScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle resume with no experience', () => {
      const noExpResume = { ...mockResume, experience: [] };
      const result = calculateCandidateJDMatch(noExpResume, mockJD);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle resume with no projects', () => {
      const noProjResume = { ...mockResume, project: [] };
      const result = calculateCandidateJDMatch(noProjResume, mockJD);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle resume with no education', () => {
      const noEduResume = { ...mockResume, education: [] };
      const result = calculateCandidateJDMatch(noEduResume, mockJD);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should give higher technical score for strong evidence', () => {
      const strongResume = {
        ...mockResume,
        experience: [
          {
            company: 'Tech Corp',
            position: 'Senior Engineer',
            description: 'Built PostgreSQL clusters handling 1M queries/day\nImplemented ETL pipelines processing 10TB daily\nOptimized Python ML models reducing inference time by 50%',
          },
        ],
      };
      const result = calculateCandidateJDMatch(strongResume, mockJD);
      expect(result.breakdownScores.technicalScore).toBeGreaterThan(80);
    });
  });
});