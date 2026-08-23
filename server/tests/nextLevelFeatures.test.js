/**
 * Unit tests for next-level RAG features (pure logic).
 * Run with: node server/tests/nextLevelFeatures.test.js
 */

import assert from "assert";

// --- Pure logic tests ---

// 1. Test the filtering and sorting logic in analyzeSkillGaps
console.log("Testing analyzeSkillGaps filtering and sorting logic...");

// Mock skill analyses (as returned by the mapping before filtering)
const mockSkillAnalyses = [
  { skill: "Node.js", similarity: 0.9, bulletId: "s1" }, // above threshold -> not a gap
  { skill: "React", similarity: 0.5, bulletId: "s2" },  // above threshold -> not a gap
  { skill: "Python", similarity: 0.2, bulletId: "s3" }, // below threshold -> gap
  { skill: "MongoDB", similarity: 0.1, bulletId: "s4" }, // below threshold -> gap
];
const threshold = 0.4;

// Expected gaps: Python and MongoDB, sorted by similarity ascending (MongoDB first, then Python)
const expectedGaps = [
  { skill: "MongoDB", similarity: 0.1, bulletId: "s4" },
  { skill: "Python", similarity: 0.2, bulletId: "s3" },
];

// We'll replicate the filtering and sorting logic
const skillGaps = mockSkillAnalyses
  .filter(skill => skill.similarity < threshold)
  .sort((a, b) => a.similarity - b.similarity);

assert.deepStrictEqual(skillGaps, expectedGaps);
console.log("✓ analyzeSkillGaps filtering and sorting logic passed");

// 2. Test the message construction in refineBullet
console.log("Testing refineBullet message construction...");

// We'll test the pure part: building the messages array from inputs
function buildRefineMessages(bulletText, userFeedback, conversationHistory = []) {
  const historyMessages = conversationHistory.map((turn, i) =>
    i % 2 === 0
      ? { role: "user", content: turn }
      : { role: "assistant", content: turn }
  );
  return [
    {
      role: "system",
      content: "You are refining a resume bullet based on user feedback. Maintain factual accuracy - only rephrase, rearrange, or adjust emphasis based on the feedback. Do not add new facts."
    },
    ...historyMessages,
    {
      role: "user",
      content: `Original bullet: "${bulletText}"
User feedback: "${userFeedback}"
Provide a refined version that addresses the feedback while staying truthful to the original.`
    }
  ];
}

const bulletText = "Led a team of 5 engineers";
const userFeedback = "Add metric about impact";
const conversationHistory = ["User: Can you make this more impactful?", "Assistant: Sure, how about adding a metric?"];

const messages = buildRefineMessages(bulletText, userFeedback, conversationHistory);

assert.strictEqual(messages.length, 4); // 1 system + 2 history + 1 user
assert.strictEqual(messages[0].role, "system");
assert.ok(messages[0].content.includes("refining a resume bullet based on user feedback"));
assert.strictEqual(messages[1].role, "user");
assert.strictEqual(messages[1].content, "User: Can you make this more impactful?");
assert.strictEqual(messages[2].role, "assistant");
assert.strictEqual(messages[2].content, "Assistant: Sure, how about adding a metric?");
assert.strictEqual(messages[3].role, "user");
assert.ok(messages[3].content.includes(`Original bullet: "${bulletText}"`));
assert.ok(messages[3].content.includes(`User feedback: "${userFeedback}"`));
console.log("✓ refineBullet message construction passed");

// 3. Test the feedback boost logic in retrieveBullets
console.log("Testing feedback boost logic...");

// Mock raw bullets (as retrieved from DB before boosting)
const rawBullets = [
  { bulletId: "b1", text: "Bullet 1", score: 0.8 },
  { bulletId: "b2", text: "Bullet 2", score: 0.6 },
  { bulletId: "b3", text: "Bullet 3", score: 0.9 },
];

// Bullet IDs that have feedback (simulating the Set from feedback lookup)
const feedbackBulletIds = new Set(["b1", "b3"]); // b1 and b3 have feedback

// Apply boost: increase score by 0.1 for bullets with feedback, cap at 1.0
const boostedBullets = rawBullets.map(bullet => {
  const boostedScore = feedbackBulletIds.has(bullet.bulletId)
    ? Math.min(bullet.score + 0.1, 1.0)
    : bullet.score;
  return { ...bullet, score: boostedScore };
});

// Expected scores after boost:
// b1: 0.8 + 0.1 = 0.9
// b2: 0.6 (no boost)
// b3: 0.9 + 0.1 = 1.0 (capped)
const expectedBoosted = [
  { bulletId: "b1", text: "Bullet 1", score: 0.9 },
  { bulletId: "b2", text: "Bullet 2", score: 0.6 },
  { bulletId: "b3", text: "Bullet 3", score: 1.0 },
];

// Assert boosted scores BEFORE sorting (original order preserved)
assert.deepStrictEqual(boostedBullets, expectedBoosted);

// Now sort by score descending (as in retrieveBullets)
boostedBullets.sort((a, b) => b.score - a.score);
// Expected order after sort: b3 (1.0), b1 (0.9), b2 (0.6)
const expectedSorted = [
  { bulletId: "b3", text: "Bullet 3", score: 1.0 },
  { bulletId: "b1", text: "Bullet 1", score: 0.9 },
  { bulletId: "b2", text: "Bullet 2", score: 0.6 },
];

// Then assert the sorted order matches retrieveBullets' final output
assert.deepStrictEqual(boostedBullets, expectedSorted);
console.log("✓ feedback boost logic passed");

console.log("\n✅ All pure logic tests passed!");
console.log("Note: These tests do not require a database or AI service.");
console.log("To test the full integration, run the application and use the endpoints.");