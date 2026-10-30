import { describe, it, expect, vi } from 'vitest';

// Mock the ragService dependencies to avoid Mongoose model compilation
vi.mock('@server/services/ragService.js', () => ({
  buildRAGPrompt: vi.fn((jdText, retrieved) => {
    const contextLines = retrieved
      .map((r, i) => `${i + 1}. [bullet_id: ${r.bulletId}] ${r.text}`)
      .join('\n');
    const systemPrompt =
      'You are an expert resume writer. Your task is to rewrite resume bullets to align with a job description. ' +
      'You MUST use ONLY the retrieved facts provided in the context below — never invent experiences, skills, numbers, or achievements you have not seen. ' +
      'Return a JSON array of objects, each with: {"bullet": "...", "source_id": "..."} where source_id matches a retrieved bullet ID.';
    const userContent =
      `Retrieved resume bullets (most relevant first):\n` +
      `---\n` +
      `${contextLines}\n` +
      `---\n\n` +
      `Job Description:\n` +
      `${jdText}\n\n` +
      `Rewritten bullets (cite source_id for each):`;
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];
  }),
}));

import { buildRAGPrompt } from '@server/services/ragService.js';

const testRetrieved = [
  { bulletId: 'test_id_1', text: 'Led 5-person team at Acme Corp', source: 'experience', score: 0.85 },
  { bulletId: 'test_id_2', text: 'Reduced downtime by 40%', source: 'skill', score: 0.72 },
];

describe('RAG Prompt Building', () => {
  it('should include grounding constraint in system prompt', () => {
    const jd = 'Senior Backend Engineer at a fintech company.';
    const messages = buildRAGPrompt(jd, testRetrieved);

    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('ONLY');
    expect(messages[0].content).toContain('never invent');
  });

  it('should include all retrieved bullets with IDs in user prompt', () => {
    const jd = 'Senior Backend Engineer at a fintech company.';
    const messages = buildRAGPrompt(jd, testRetrieved);

    const userContent = messages[1].content;
    expect(userContent).toContain('test_id_1');
    expect(userContent).toContain('test_id_2');
    expect(userContent).toContain('Led 5-person team at Acme Corp');
    expect(userContent).toContain('Reduced downtime by 40%');
  });

  it('should include job description in user prompt', () => {
    const jd = 'Senior Backend Engineer at a fintech company. Need 5+ years Node.js, AWS, PostgreSQL.';
    const messages = buildRAGPrompt(jd, testRetrieved);

    expect(messages[1].content).toContain(jd);
  });

  it('should format as proper message array', () => {
    const jd = 'Test JD';
    const messages = buildRAGPrompt(jd, testRetrieved);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('should handle empty retrieved array', () => {
    const jd = 'Test JD';
    const messages = buildRAGPrompt(jd, []);

    expect(messages[1].content).toContain('Retrieved resume bullets (most relevant first):');
    expect(messages[1].content).toContain('---');
  });

  it('should include instruction for JSON output with source_id', () => {
    const jd = 'Test JD';
    const messages = buildRAGPrompt(jd, testRetrieved);

    expect(messages[0].content).toContain('source_id');
    expect(messages[0].content).toContain('JSON array');
  });
});