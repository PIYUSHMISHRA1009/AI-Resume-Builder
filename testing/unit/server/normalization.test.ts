import { describe, it, expect } from 'vitest';
import { normalizeSkill, normalizeSkillList, getSkillCategory } from '@server/services/normalizationService.js';

describe('Skill Normalization Layer', () => {
  describe('normalizeSkill', () => {
    it('should normalize Postgres variations to POSTGRESQL', () => {
      expect(normalizeSkill('Postgres')).toBe('POSTGRESQL');
      expect(normalizeSkill('PostgreSQL')).toBe('POSTGRESQL');
      expect(normalizeSkill('PostgreSQL DB')).toBe('POSTGRESQL');
      expect(normalizeSkill('Postgres DB')).toBe('POSTGRESQL');
      expect(normalizeSkill('psql')).toBe('POSTGRESQL');
    });

    it('should normalize MySQL variations', () => {
      expect(normalizeSkill('MySQL')).toBe('MYSQL');
      expect(normalizeSkill('my sql')).toBe('MYSQL');
    });

    it('should normalize MongoDB variations', () => {
      expect(normalizeSkill('MongoDB')).toBe('MONGODB');
      expect(normalizeSkill('Mongo DB')).toBe('MONGODB');
      expect(normalizeSkill('mongo')).toBe('MONGODB');
    });

    it('should normalize SQL Server variations', () => {
      expect(normalizeSkill('SQL Server')).toBe('MS SQL SERVER');
      expect(normalizeSkill('MSSQL')).toBe('MS SQL SERVER');
    });

    it('should normalize BI tool variations', () => {
      expect(normalizeSkill('PowerBI')).toBe('POWER BI');
      expect(normalizeSkill('Power BI')).toBe('POWER BI');
      expect(normalizeSkill('powerbi')).toBe('POWER BI');
      expect(normalizeSkill('Tableau')).toBe('TABLEAU');
      expect(normalizeSkill('Looker')).toBe('LOOKER');
    });

    it('should normalize language variations', () => {
      expect(normalizeSkill('Python')).toBe('PYTHON');
      expect(normalizeSkill('python3')).toBe('PYTHON');
      expect(normalizeSkill('JavaScript')).toBe('JAVASCRIPT');
      expect(normalizeSkill('JS')).toBe('JAVASCRIPT');
      expect(normalizeSkill('TypeScript')).toBe('TYPESCRIPT');
      expect(normalizeSkill('TS')).toBe('TYPESCRIPT');
    });

    it('should normalize ML/AI variations', () => {
      expect(normalizeSkill('Machine Learning')).toBe('MACHINE LEARNING');
      expect(normalizeSkill('ML')).toBe('MACHINE LEARNING');
      expect(normalizeSkill('Deep Learning')).toBe('DEEP LEARNING');
      expect(normalizeSkill('NLP')).toBe('NLP');
      expect(normalizeSkill('LLM')).toBe('LLM');
    });

    it('should normalize cloud variations', () => {
      expect(normalizeSkill('AWS')).toBe('AWS');
      expect(normalizeSkill('Amazon Web Services')).toBe('AWS');
      expect(normalizeSkill('Azure')).toBe('AZURE');
      expect(normalizeSkill('GCP')).toBe('GCP');
      expect(normalizeSkill('Google Cloud')).toBe('GCP');
    });

    it('should normalize DevOps variations', () => {
      expect(normalizeSkill('Docker')).toBe('DOCKER');
      expect(normalizeSkill('Kubernetes')).toBe('KUBERNETES');
      expect(normalizeSkill('K8s')).toBe('KUBERNETES');
    });

    it('should normalize soft skill variations', () => {
      expect(normalizeSkill('Problem Solving')).toBe('PROBLEM SOLVING');
      expect(normalizeSkill('Communication')).toBe('COMMUNICATION');
      expect(normalizeSkill('Project Management')).toBe('PROJECT MANAGEMENT');
      expect(normalizeSkill('Agile')).toBe('AGILE');
    });

    it('should handle empty and invalid input', () => {
      expect(normalizeSkill('')).toBe('');
      expect(normalizeSkill(null as any)).toBe('');
      expect(normalizeSkill(undefined as any)).toBe('');
    });

    it('should fallback to uppercase for unknown skills', () => {
      expect(normalizeSkill('UnknownSkill')).toBe('UNKNOWNSKILL');
      expect(normalizeSkill('some-random-skill')).toBe('SOME-RANDOM-SKILL');
    });
  });

  describe('normalizeSkillList', () => {
    it('should normalize and deduplicate skills', () => {
      const result = normalizeSkillList(['Postgres', 'Power BI', 'PostgreSQL DB', 'Python']);
      expect(result.length).toBe(3);
      expect(result[0].canonical).toBe('POSTGRESQL');
      expect(result[1].canonical).toBe('POWER BI');
      expect(result[2].canonical).toBe('PYTHON');
    });

    it('should handle empty array', () => {
      expect(normalizeSkillList([])).toEqual([]);
    });

    it('should handle null/undefined input', () => {
      expect(normalizeSkillList(null as any)).toEqual([]);
      expect(normalizeSkillList(undefined as any)).toEqual([]);
    });

    it('should include category for each skill', () => {
      const result = normalizeSkillList(['Python', 'AWS', 'Communication']);
      const python = result.find(r => r.canonical === 'PYTHON');
      const aws = result.find(r => r.canonical === 'AWS');
      const comm = result.find(r => r.canonical === 'COMMUNICATION');
      expect(python?.category).toBe('Technical');
      expect(aws?.category).toBe('Tool');
      expect(comm?.category).toBe('Soft Skill');
    });
  });

  describe('getSkillCategory', () => {
    it('should return correct categories', () => {
      expect(getSkillCategory('POSTGRESQL')).toBe('Technical');
      expect(getSkillCategory('POWER BI')).toBe('Tool');
      expect(getSkillCategory('MACHINE LEARNING')).toBe('Domain');
      expect(getSkillCategory('COMMUNICATION')).toBe('Soft Skill');
    });

    it('should default to Technical for unknown skills', () => {
      expect(getSkillCategory('UNKNOWN')).toBe('Technical');
      expect(getSkillCategory('')).toBe('Technical');
    });
  });
});