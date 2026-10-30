import { describe, it, expect, vi } from 'vitest';

vi.mock('@server/configs/ai.js', () => ({
  default: { embeddings: { create: vi.fn() } },
}));

import { cosineSimilarity, chunkExperience } from '@server/services/embeddingService.js';

describe('Embedding Service', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      expect(cosineSimilarity(a, b)).toBe(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('should return 1 for parallel vectors', () => {
      const a = [1, 2, 3];
      const b = [2, 4, 6];
      expect(cosineSimilarity(a, b)).toBe(1);
    });

    it('should return 0 for zero vector', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('should return 0 for mismatched length vectors', () => {
      const a = [1, 2, 3];
      const b = [4, 5];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('should return 0 for null/undefined input', () => {
      expect(cosineSimilarity(null as any, [1, 2, 3])).toBe(0);
      expect(cosineSimilarity([1, 2, 3], undefined as any)).toBe(0);
    });

    it('should handle negative values correctly', () => {
      const a = [-1, -2, -3];
      const b = [-2, -4, -6];
      expect(cosineSimilarity(a, b)).toBe(1);
    });

    it('should return correct similarity for known vectors', () => {
      const a = [3, 4];
      const b = [4, 3];
      const result = cosineSimilarity(a, b);
      expect(result).toBeCloseTo(0.96, 1);
    });
  });

  describe('chunkExperience', () => {
    it('should return empty array for empty string', () => {
      expect(chunkExperience('')).toEqual([]);
    });

    it('should return empty array for whitespace only', () => {
      expect(chunkExperience('   \n\t  ')).toEqual([]);
    });

    it('should split by newlines and trim', () => {
      const desc = 'Line 1\n\n  \nLine 2  ';
      expect(chunkExperience(desc)).toEqual(['Line 1', 'Line 2']);
    });

    it('should handle single line', () => {
      expect(chunkExperience('Single line')).toEqual(['Single line']);
    });

    it('should handle multiple lines', () => {
      const desc = 'First line\nSecond line\nThird line';
      expect(chunkExperience(desc)).toEqual(['First line', 'Second line', 'Third line']);
    });

    it('should handle Windows line endings', () => {
      const desc = 'Line 1\r\nLine 2\r\nLine 3';
      expect(chunkExperience(desc)).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should filter out empty lines', () => {
      const desc = 'Line 1\n\n\nLine 2';
      expect(chunkExperience(desc)).toEqual(['Line 1', 'Line 2']);
    });
  });
});
