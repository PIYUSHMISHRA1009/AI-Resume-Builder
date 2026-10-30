import "dotenv/config";
import mongoose from "mongoose";
import ai from "../configs/ai.js";
import { getEmbedding, cosineSimilarity, chunkExperience } from "./embeddingService.js";
import Bullet from "../models/Bullet.js";
import RAGEvalLog from "../models/RAGEvalLog.js";
import RefinementFeedback from "../models/RefinementFeedback.js";
import Resume from "../models/Resume.js";
import { fileURLToPath } from "url";
import {
  VECTOR_STORE,
  initQdrant,
  upsertToQdrant,
  deleteFromQdrant,
  searchQdrant,
} from "./vectorStore/index.js";

const SIMILARITY_THRESHOLD = parseFloat(
  process.env.RAG_SIMILARITY_THRESHOLD || "0.3"
);
const LOG_EVAL = process.env.RAG_LOG_EVAL !== "false";

/**
 * Extract text chunks from a Resume document into bullet candidates.
 * Each skill, experience line, project, and summary becomes one bullet.
 */
export const extractBulletsFromResume = (resume) => {
  const bullets = [];

  if (resume.professional_summary) {
    bullets.push({
      text: resume.professional_summary,
      source: "summary",
      metadata: { resumeId: resume._id },
    });
  }

  if (Array.isArray(resume.skills)) {
    resume.skills.forEach((skill) => {
      if (skill && skill.trim()) {
        bullets.push({
          text: skill,
          source: "skill",
          metadata: { resumeId: resume._id },
        });
      }
    });
  }

  if (Array.isArray(resume.experience)) {
    resume.experience.forEach((exp) => {
      if (exp.description) {
        const lines = chunkExperience(exp.description);
        lines.forEach((line) => {
          bullets.push({
            text: line,
            source: "experience",
            metadata: {
              resumeId: resume._id,
              company: exp.company,
              position: exp.position,
            },
          });
        });
      }
    });
  }

  if (Array.isArray(resume.project)) {
    resume.project.forEach((proj) => {
      if (proj.description) {
        bullets.push({
          text: proj.description,
          source: "project",
          metadata: {
            resumeId: resume._id,
            name: proj.name,
            type: proj.type,
          },
        });
      }
    });
  }

  return bullets;
};

/**
 * Index all bullets from a resume into the vector store.
 * Deletes existing bullets for this resume first (idempotent re-index).
 */
export const indexResumeBullets = async (resumeId, userId) => {
  const resume = await Resume.findOne({
    _id: resumeId,
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!resume) {
    throw new Error("Resume not found");
  }

  // Get existing bullet IDs before deletion for Qdrant cleanup
  let existingBulletIds = [];
  if (VECTOR_STORE !== "mongodb") {
    try {
      existingBulletIds = await Bullet.find({ resumeId: resume._id })
        .distinct("_id")
        .then(ids => ids.map(id => id.toString()));
    } catch (err) {
      console.error("[Qdrant] Failed to get existing bullet IDs:", err.message);
    }
  }

  // Clear previous bullets for this resume (re-index is idempotent)
  await Bullet.deleteMany({ resumeId: resume._id });

  // Also delete from Qdrant if enabled
  if (VECTOR_STORE !== "mongodb" && existingBulletIds.length > 0) {
    try {
      await deleteFromQdrant(existingBulletIds);
    } catch (qdrantErr) {
      console.error("[Qdrant] Failed to delete bullets:", qdrantErr.message);
    }
  }

  const bulletCandidates = extractBulletsFromResume(resume);
  const created = [];

  for (const bullet of bulletCandidates) {
    const embedding = await getEmbedding(bullet.text);
    const doc = await Bullet.create({
      userId: resume.userId,
      resumeId: resume._id,
      text: bullet.text,
      source: bullet.source,
      metadata: bullet.metadata,
      embedding,
      embeddingModel: process.env.EMBEDDING_MODEL,
      embeddingDimension: embedding.length,
    });

    // Dual-write to Qdrant if enabled
    if (VECTOR_STORE !== "mongodb") {
      try {
        await upsertToQdrant(doc._id.toString(), embedding, {
          userId: doc.userId.toString(),
          resumeId: doc.resumeId.toString(),
          text: doc.text,
          source: doc.source,
          embeddingModel: doc.embeddingModel,
          embeddingDimension: doc.embeddingDimension,
          metadata: doc.metadata,
        });
      } catch (qdrantErr) {
        console.error("[Qdrant] Failed to upsert bullet:", qdrantErr.message);
        // Continue - MongoDB is source of truth
      }
    }

    created.push(doc);
  }

  return created;
};

/**
 * Retrieve top-k relevant bullets for a JD embedding.
 *
 * VECTOR_STORE modes:
 * - "qdrant": Qdrant primary, MongoDB fallback
 * - "shadow": Both queried, MongoDB authoritative
 * - "mongodb": Existing behavior only
 */
export const retrieveBullets = async (userId, jdEmbedding, topK = 5, resumeId = null) => {
  // Helper to get raw bullet scores from MongoDB (existing logic)
  const getMongoRawBullets = async () => {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const currentEmbeddingModel = process.env.EMBEDDING_MODEL || "gemini-embedding-2";
    const vectorFilter = { userId: userIdObj, embeddingModel: currentEmbeddingModel };

    if (resumeId) {
      vectorFilter.resumeId = new mongoose.Types.ObjectId(resumeId);
    }

    // Attempt Atlas Vector Search
    try {
      const pipeline = [
        {
          $vectorSearch: {
            index: process.env.RAG_VECTOR_SEARCH_INDEX || "bulletVectorIndex",
            path: "embedding",
            queryVector: jdEmbedding,
            numCandidates: Math.max(100, topK * 10),
            limit: topK * 2, // Get extra to allow for boosting to change order
            filter: vectorFilter,
          },
        },
        {
          $project: {
            text: 1,
            source: 1,
            metadata: 1,
            score: { $meta: "vectorSearchMeta" },
          },
        },
      ];

      const results = await Bullet.aggregate(pipeline);
      if (results.length > 0) {
        return results.map((r) => ({
          bulletId: r._id,
          text: r.text,
          source: r.source,
          metadata: r.metadata,
          score: r.score || 0,
        }));
      }
    } catch (err) {
      // Vector search index not configured or server doesn't support it.
      // Fall through to in-memory cosine similarity.
    }

    // Fallback: in-memory cosine similarity
    const query = { userId: userIdObj, embeddingModel: currentEmbeddingModel };
    if (resumeId) {
      query.resumeId = new mongoose.Types.ObjectId(resumeId);
    }

    const allBullets = await Bullet.find(query).exec();

    return allBullets.map((b) => ({
      bulletId: b._id,
      text: b.text,
      source: b.source,
      metadata: b.metadata,
      score: cosineSimilarity(jdEmbedding, b.embedding || []),
    }));
  };

  // Helper to get raw bullets from Qdrant
  const getQdrantRawBullets = async () => {
    const filter = {
      userId,
      embeddingModel: process.env.EMBEDDING_MODEL || "gemini-embedding-2",
    };
    if (resumeId) {
      filter.resumeId = resumeId;
    }

    const results = await searchQdrant(jdEmbedding, topK * 2, filter);
    if (!results || results.length === 0) {
      return null;
    }

    return results.map((r) => ({
      bulletId: r.bulletId,
      text: r.text,
      source: r.source,
      metadata: r.metadata,
      score: r.score || 0,
    }));
  };

  // Apply feedback boost to raw bullets
  const applyFeedbackBoost = async (rawBullets) => {
    if (rawBullets.length === 0) return rawBullets;

    const bulletIds = rawBullets.map(b => b.bulletId);
    const feedbacks = await RefinementFeedback.find({
      userId: new mongoose.Types.ObjectId(userId),
      bulletId: { $in: bulletIds }
    }).lean();

    // Create a Set of bulletIds that have at least one feedback
    const feedbackBulletIds = new Set();
    feedbacks.forEach(fb => {
      feedbackBulletIds.add(fb.bulletId.toString());
    });

    // Boost score for bullets with feedback
    return rawBullets.map(bullet => {
      const boostedScore = feedbackBulletIds.has(bullet.bulletId.toString())
        ? Math.min(bullet.score + 0.1, 1.0) // Boost by 0.1, cap at 1.0
        : bullet.score;
      return { ...bullet, score: boostedScore };
    });
  };

  // Main retrieval logic based on VECTOR_STORE mode
  let rawBullets;
  let shadowComparison = null;

  if (VECTOR_STORE === "qdrant") {
    // Qdrant primary with MongoDB fallback
    rawBullets = await getQdrantRawBullets();
    if (!rawBullets) {
      console.log("[Qdrant] Primary search failed, falling back to MongoDB");
      rawBullets = await getMongoRawBullets();
    }
  } else if (VECTOR_STORE === "shadow") {
    // Shadow mode: both queried, MongoDB authoritative
    console.log("[Shadow] Retrieval started");
    const [mongoResults, qdrantResults] = await Promise.all([
      getMongoRawBullets(),
      getQdrantRawBullets(),
    ]);
    rawBullets = mongoResults;

    console.log("[Shadow] MongoDB results:", mongoResults.length);
    console.log("[Shadow] Qdrant results:", qdrantResults ? qdrantResults.length : 0);

    // Always compute and log shadow comparison, even if Qdrant fails
    const mongoIds = new Set(mongoResults.map(r => r.bulletId.toString()));
    const qdrantIds = qdrantResults
      ? new Set(qdrantResults.map(r => r.bulletId.toString()))
      : new Set();
    const overlap = [...qdrantIds].filter(id => mongoIds.has(id)).length;

    shadowComparison = {
      mongoCount: mongoResults.length,
      qdrantCount: qdrantResults ? qdrantResults.length : 0,
      overlap,
      recall: qdrantIds.size > 0 ? overlap / qdrantIds.size : 0,
      mongoIds: [...mongoIds],
      qdrantIds: [...qdrantIds],
    };

    console.log("[Shadow] MongoDB vs Qdrant:", JSON.stringify(shadowComparison));
  } else {
    // MongoDB only (existing behavior)
    rawBullets = await getMongoRawBullets();
  }

  // Apply feedback boost, sort, and limit to topK
  const boostedBullets = await applyFeedbackBoost(rawBullets);
  boostedBullets.sort((a, b) => b.score - a.score);

  // In shadow mode, attach comparison data for logging
  if (VECTOR_STORE === "shadow" && shadowComparison) {
    return {
      bullets: boostedBullets.slice(0, topK),
      shadow: shadowComparison,
    };
  }

  return boostedBullets.slice(0, topK);
};

/**
 * Build the RAG prompt that constrains the LLM to ONLY use retrieved facts.
 * Every retrieved bullet is annotated with its source ID so outputs can be
 * traced back and audited for hallucination.
 */
export const buildRAGPrompt = (jdText, retrieved) => {
  const contextLines = retrieved
    .map((r, i) => `${i + 1}. [bullet_id: ${r.bulletId}] ${r.text}`)
    .join("\n");

  const systemPrompt =
    "You are an expert resume writer helping tailor a resume to a specific job. " +
    "You MUST use ONLY the retrieved facts provided in the context below — " +
    "never invent experiences, skills, numbers, or achievements you have not seen. " +
    "If the job requires a skill or experience not present in the context, " +
    "explicitly state that instead of fabricating. " +
    "Return a JSON array of objects, each with: {\"bullet\": \"...\", \"source_id\": \"...\"} " +
    "where source_id matches a retrieved bullet ID.";

  const userContent =
    `Retrieved resume bullets (most relevant first):\n` +
    `---\n` +
    `${contextLines}\n` +
    `---\n\n` +
    `Job Description:\n` +
    `${jdText}\n\n` +
    `Rewritten bullets (cite source_id for each):`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
};

/**
 * Main RAG orchestrator: embed JD → retrieve → prompt → generate → log.
 */
export const tailorResume = async (userId, jdText, resumeId = null, topK = 5) => {
  const startMs = Date.now();

  // [1] Embed the job description
  const jdEmbedding = await getEmbedding(jdText);

  // [2] Retrieve top-k relevant bullets from the user's corpus
  const retrievedResult = await retrieveBullets(userId, jdEmbedding, topK, resumeId);

  // Handle shadow mode response format
  let retrieved;
  if (VECTOR_STORE === "shadow" && retrievedResult.shadow) {
    retrieved = retrievedResult.bullets;
    console.log("[Shadow] Retrieval comparison:", JSON.stringify(retrievedResult.shadow));
  } else {
    retrieved = retrievedResult;
  }

  // [3] Build the grounded prompt
  const messages = buildRAGPrompt(jdText, retrieved);

  // [4] Generate tailored bullets (grounded in retrieved context)
  const response = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages,
  });

  const rawContent = response.choices[0].message.content.trim();

  let tailoredBullets;
  try {
    tailoredBullets = JSON.parse(rawContent);
  } catch {
    // Model returned non-JSON — flag as ungrounded
    tailoredBullets = [{ bullet: rawContent, source_id: null }];
  }

  const latencyMs = Date.now() - startMs;

  // [5] Eval logging
  const hitCount = retrieved.filter((r) => r.score >= SIMILARITY_THRESHOLD).length;
  const hitRate = retrieved.length > 0 ? hitCount / retrieved.length : 0;

  if (LOG_EVAL) {
    await RAGEvalLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      jdText: jdText.slice(0, 500),
      resumeId: resumeId ? new mongoose.Types.ObjectId(resumeId) : undefined,
      topK,
      retrieved: retrieved.map((r) => ({
        bulletId: r.bulletId,
        text: r.text,
        source: r.source,
        score: r.score,
      })),
      hitRate,
      generatedBullets: tailoredBullets,
      latencyMs,
    });
  }

  return {
    tailoredBullets,
    retrievedContext: retrieved,
    hitRate,
    latencyMs,
  };
};

export const analyzeSkillGaps = async (userId, jdText, threshold) => {
  // Use environment variable as default, but allow override via parameter
  const effectiveThreshold = threshold !== undefined
    ? parseFloat(threshold)
    : parseFloat(process.env.RAG_SKILL_GAP_THRESHOLD || "0.4");

  const userIdObj = new mongoose.Types.ObjectId(userId);

  // Get embedding for the job description
  const jdEmbedding = await getEmbedding(jdText);

  const currentEmbeddingModel = process.env.EMBEDDING_MODEL || "gemini-embedding-2";

  // Get all skill bullets for the user (source: "skill")
  const skillBullets = await Bullet.find({
    userId: userIdObj,
    source: "skill",
    embeddingModel: currentEmbeddingModel,
  }).exec();

  if (!skillBullets || skillBullets.length === 0) {
    return [];
  }

  // Calculate similarity for each skill bullet
  const skillAnalyses = skillBullets.map(bullet => {
    const similarity = cosineSimilarity(jdEmbedding, bullet.embedding || []);
    return {
      skill: bullet.text,
      similarity,
      bulletId: bullet._id,
      // Generate a suggestion based on the gap
      suggestion: similarity < effectiveThreshold
        ? `Consider developing experience with ${bullet.text.toLowerCase()}`
        : `Your experience with ${bullet.text.toLowerCase()} aligns well`
    };
  });

  // Filter for skills below the threshold (gaps) and sort by similarity (lowest first = biggest gaps)
  const skillGaps = skillAnalyses
    .filter(skill => skill.similarity < effectiveThreshold)
    .sort((a, b) => a.similarity - b.similarity);

  return skillGaps;
};

/**
 * Refine a resume bullet based on user feedback
 * @param {string} userId - User ID
 * @param {string} bulletId - Bullet ID to refine
 * @param {string} userFeedback - User feedback for refinement
 * @param {Array} conversationHistory - Previous conversation turns
 * @returns {Promise<string>} Refined bullet text
 */
export const refineBullet = async (userId, bulletId, userFeedback, conversationHistory = []) => {
  // Retrieve the original bullet for context
  const bullet = await Bullet.findById(bulletId).where({ userId });

  if (!bullet) {
    throw new Error("Bullet not found or access denied");
  }

  // Build prompt with conversation history and specific feedback.
  // System instruction goes FIRST — OpenAI-compatible APIs expect it leading.
  const messages = [
    {
      role: "system",
      content: "You are refining a resume bullet based on user feedback. Maintain factual accuracy - only rephrase, rearrange, or adjust emphasis based on the feedback. Do not add new facts."
    },
    ...conversationHistory.map((turn, i) =>
      i % 2 === 0
        ? { role: "user", content: turn }
        : { role: "assistant", content: turn }
    ),
    {
      role: "user",
      content: `Original bullet: "${bullet.text}"
User feedback: "${userFeedback}"
Provide a refined version that addresses the feedback while staying truthful to the original.`
    }
  ];

  // Generate refinement using same AI client
  const response = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages,
    temperature: 0.3 // Lower temperature for more focused edits
  });

  return response.choices[0].message.content;
};


// Self-test: verify the prompt template contains the grounding constraint
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename;

if (isMain) {
  const testRetrieved = [
    { bulletId: "test1", text: "Managed 5-person engineering team", source: "experience", metadata: {}, score: 0.85 },
    { bulletId: "test2", text: "Reduced cloud costs by 40%", source: "experience", metadata: {}, score: 0.72 },
  ];

  const messages = buildRAGPrompt("Need a senior backend engineer with team leadership.", testRetrieved);

  const hasConstraint = messages[0].content.includes("ONLY") && messages[0].content.includes("never invent");
  const hasContext1 = messages[1].content.includes("test1") && messages[1].content.includes("Managed 5-person");
  const hasContext2 = messages[1].content.includes("test2") && messages[1].content.includes("Reduced cloud costs");
  const hasJD = messages[1].content.includes("senior backend engineer");

  console.assert(hasConstraint, "System prompt must contain the 'ONLY retrieved facts' grounding constraint");
  console.assert(hasContext1, "Prompt must include first retrieved bullet with source ID");
  console.assert(hasContext2, "Prompt must include second retrieved bullet with source ID");
  console.assert(hasJD, "Prompt must include the job description text");

  console.log("✓ ragService.buildRAGPrompt self-check passed");
}
