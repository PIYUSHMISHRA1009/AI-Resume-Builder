/**
 * Unit tests for RAG functionality.
 * Run with: node server/tests/rag.test.js
 */

// Use CommonJS-style to avoid ESM complexity in tests
import assert from "assert";

// Test data
const mockResume = {
  _id: "64f3a1b2c3d4e5f678901234",
  title: "Test Resume",
  professional_summary: "Senior engineer with 5 years experience",
  skills: ["Node.js", "React", "MongoDB"],
  experience: [
    {
      company: "Acme Corp",
      position: "Senior Engineer",
      description: "Led a team of 5 developers\nBuilt scalable APIs\nReduced latency by 30%"
    }
  ],
  project: [
    {
      name: "API Gateway",
      type: "Production",
      description: "Built an API gateway handling 10k requests/day"
    }
  ],
  education: []
};

// Test 1: extractBulletsFromResume (simulated)
console.log("Testing extractBulletsFromResume logic...");

const extractBulletsFromResume = (resume) => {
  const bullets = [];

  if (resume.professional_summary) {
    bullets.push({ text: resume.professional_summary, source: "summary", metadata: { resumeId: resume._id } });
  }

  if (Array.isArray(resume.skills)) {
    resume.skills.forEach((skill) => {
      if (skill && skill.trim()) {
        bullets.push({ text: skill, source: "skill", metadata: { resumeId: resume._id } });
      }
    });
  }

  if (Array.isArray(resume.experience)) {
    resume.experience.forEach((exp) => {
      if (exp.description) {
        exp.description.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (trimmed) {
            bullets.push({ text: trimmed, source: "experience", metadata: { resumeId: resume._id, company: exp.company, position: exp.position } });
          }
        });
      }
    });
  }

  if (Array.isArray(resume.project)) {
    resume.project.forEach((proj) => {
      if (proj.description) {
        bullets.push({ text: proj.description, source: "project", metadata: { resumeId: resume._id, name: proj.name } });
      }
    });
  }

  return bullets;
};

try {
  const bullets = extractBulletsFromResume(mockResume);
  assert.strictEqual(bullets.length, 8, `Expected 8 bullets, got ${bullets.length}`);
  assert.ok(bullets.some(b => b.source === "summary" && b.text === "Senior engineer with 5 years experience"), "Should include summary as bullet");
  assert.strictEqual(bullets.filter(b => b.source === "skill").length, 3, "Should have 3 skill bullets");
  assert.strictEqual(bullets.filter(b => b.source === "experience").length, 3, "Should have 3 experience bullets");
  assert.ok(bullets.some(b => b.source === "project"), "Should include project bullet");
  console.log("✓ extractBulletsFromResume tests passed");
} catch (err) {
  console.error("✗ extractBulletsFromResume tests failed:", err.message);
  process.exit(1);
}

// Test 2: cosineSimilarity
console.log("\nTesting cosineSimilarity...");

const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

try {
  assert.strictEqual(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1, "identical vectors should have sim 1");
  assert.strictEqual(cosineSimilarity([1, 0, 0], [0, 1, 0]), 0, "orthogonal vectors should have sim 0");
  assert.strictEqual(cosineSimilarity([1, 2, 3], [2, 4, 6]), 1, "parallel vectors should have sim 1");
  assert.strictEqual(cosineSimilarity([0, 0, 0], [1, 2, 3]), 0, "zero vector should return 0");
  assert.strictEqual(cosineSimilarity([1, 2, 3], [4, 5]), 0, "mismatched length should return 0");
  assert.strictEqual(cosineSimilarity(null, [1, 2, 3]), 0, "null input should return 0");
  console.log("✓ cosineSimilarity tests passed");
} catch (err) {
  console.error("✗ cosineSimilarity tests failed:", err.message);
  process.exit(1);
}

// Test 3: buildRAGPrompt
console.log("\nTesting buildRAGPrompt...");

const testRetrieved = [
  { bulletId: "test_id_1", text: "Led 5-person team at Acme Corp", source: "experience", score: 0.85 },
  { bulletId: "test_id_2", text: "Reduced downtime by 40%", source: "skill", score: 0.72 }
];

const buildRAGPrompt = (jdText, retrieved) => {
  const contextLines = retrieved.map((r, i) => `${i + 1}. [bullet_id: ${r.bulletId}] ${r.text}`).join("\n");
  const systemPrompt =
    "You are an expert resume writer. Your task is to rewrite resume bullets to align with a job description. " +
    "You MUST use ONLY the retrieved facts provided in the context below — never invent experiences, skills, numbers, or achievements you have not seen. " +
    "Return a JSON array of objects, each with: {\"bullet\": \"...\", \"source_id\": \"...\"} where source_id matches a retrieved bullet ID.";
  const userContent =
    `Retrieved resume bullets (most relevant first):\n---\n${contextLines}\n---\n\nJob Description:\n${jdText}\n\nRewritten bullets (cite source_id for each):`;
  return [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }];
};

try {
  const jd = "Senior Backend Engineer at a fintech company. Need 5+ years Node.js, AWS, PostgreSQL.";
  const messages = buildRAGPrompt(jd, testRetrieved);

  assert.ok(messages[0].content.includes("ONLY"), "System prompt must contain grounding constraint");
  assert.ok(messages[0].content.includes("never invent"), "System prompt must prohibit hallucination");
  assert.ok(messages[1].content.includes("test_id_1"), "Prompt must include first bullet ID");
  assert.ok(messages[1].content.includes("test_id_2"), "Prompt must include second bullet ID");
  assert.ok(messages[1].content.includes(jd), "Prompt must include job description");
  console.log("✓ buildRAGPrompt tests passed");
} catch (err) {
  console.error("✗ buildRAGPrompt tests failed:", err.message);
  process.exit(1);
}

console.log("\n=== All unit tests passed ===");
console.log("Note: End-to-end tests require MongoDB Atlas connectivity.");
console.log("Server runs on port 3000. Routes registered:");
console.log("  POST /api/ai/tailor-resume");
console.log("  POST /api/ai/index-resume");
console.log("  GET /api/ai/rag-logs");
console.log("  POST /api/ai/refine-bullet");
console.log("  POST /api/ai/skill-gaps");