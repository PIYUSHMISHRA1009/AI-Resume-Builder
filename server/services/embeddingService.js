import "dotenv/config";
import ai from "../configs/ai.js";
import { fileURLToPath } from "url";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Embed a text string using the configured embedding model.
 * Reuses the existing OpenAI-compatible `ai` client (Google endpoint).
 * Add an `OPENAI_EMBEDDING_KEY` env var + separate client if you need a
 * dedicated OpenAI key for embeddings.
 */
export const getEmbedding = async (text) => {
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new Error("Cannot embed empty text");
  }

  const model = process.env.EMBEDDING_MODEL || "text-embedding-004";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.embeddings.create({
        model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Embedding failed after ${MAX_RETRIES} attempts: ${error.message}`
        );
      }
      await delay(RETRY_DELAY_MS * attempt);
    }
  }
};

/**
 * Split a multi-line experience description into individual bullet lines.
 * Each non-empty trimmed line becomes a separate bullet for indexing.
 */
export const chunkExperience = (description) => {
  if (!description) return [];
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

/**
 * Cosine similarity between two float arrays.
 * Returns 0 for mismatched lengths or zero vectors.
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Self-test (ponyail: one runnable check for non-trivial logic)
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename;

if (isMain) {
  const a = [1, 0, 0];
  const b = [1, 0, 0];
  const c = [0, 1, 0];

  console.assert(cosineSimilarity(a, b) === 1, "identical vectors → sim 1");
  console.assert(cosineSimilarity(a, c) === 0, "orthogonal vectors → sim 0");
  console.assert(
    Math.abs(cosineSimilarity([1, 2, 3], [2, 4, 6]) - 1) < 0.001,
    "parallel vectors → sim 1"
  );
  console.assert(
    cosineSimilarity([0, 0, 0], [1, 2, 3]) === 0,
    "zero vector → sim 0"
  );

  // chunkExperience tests
  console.assert(chunkExperience("").length === 0, "empty desc → no chunks");
  console.assert(
    chunkExperience("Line 1\n\n  \nLine 2  ").join("|") === "Line 1|Line 2",
    "whitespace/newlines trimmed and filtered"
  );

  console.log("✓ embeddingService self-check passed");
}
