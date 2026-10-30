/**
 * Validate Qdrant migration against MongoDB.
 *
 * Compares MongoDB Bullet documents with Qdrant points to ensure
 * the migration was successful and data integrity is maintained.
 *
 * Usage:
 *   node scripts/validateQdrantMigration.js
 */

import "dotenv/config";
import mongoose from "mongoose";
import Bullet from "../models/Bullet.js";
import {
  initQdrant,
  getQdrantCollectionInfo,
  searchQdrant,
  getQdrantHealth,
} from "../services/vectorStore/index.js";

const validate = async () => {
  const mongodbUri = process.env.MONGODB_URI?.replace(/^["']|["'];?$/g, "").trim();
  if (!mongodbUri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  console.log("=== Qdrant Migration Validation ===\n");

  // Connect to MongoDB
  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongodbUri, { dbName: "resume-builder" });
  console.log("Connected to MongoDB\n");

  // Count eligible MongoDB vectors
  const mongoCount = await Bullet.countDocuments({
    embedding: { $exists: true, $ne: [] },
    embeddingModel: process.env.EMBEDDING_MODEL || "gemini-embedding-2",
    embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSIONS || "3072"),
  });
  console.log(`MongoDB eligible vectors: ${mongoCount}`);

  // Initialize Qdrant
  console.log("\nInitializing Qdrant...");
  const qdrantHealth = await getQdrantHealth();
  console.log(`Qdrant health: ${qdrantHealth.status}`);

  if (qdrantHealth.status !== "ok") {
    console.error("Qdrant is not available");
    await mongoose.disconnect();
    process.exit(1);
  }

  await initQdrant();

  const collectionInfo = await getQdrantCollectionInfo();
  if (!collectionInfo) {
    console.error("Could not retrieve Qdrant collection info");
    await mongoose.disconnect();
    process.exit(1);
  }

  const qdrantCount = collectionInfo.points_count || 0;
  console.log(`Qdrant points count: ${qdrantCount}`);

  // Validate counts match
  console.log("\n--- Count Validation ---");
  if (mongoCount === qdrantCount) {
    console.log(`✅ Counts match: ${mongoCount}`);
  } else {
    console.log(`⚠️  Count mismatch: MongoDB=${mongoCount}, Qdrant=${qdrantCount}`);
  }

  // Validate sample vectors
  console.log("\n--- Sample Vector Validation ---");
  const sampleBullets = await Bullet.find({
    embedding: { $exists: true, $ne: [] },
    embeddingModel: process.env.EMBEDDING_MODEL || "gemini-embedding-2",
    embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSIONS || "3072"),
  }).limit(5);

  let sampleValid = 0;
  for (const bullet of sampleBullets) {
    const results = await searchQdrant(bullet.embedding, 1, {
      userId: bullet.userId.toString(),
    });

    if (results && results.length > 0 && results[0].bulletId === bullet._id.toString()) {
      sampleValid++;
    }
  }

  console.log(`Sample validation: ${sampleValid}/${sampleBullets.length} passed`);

  // Test filtered retrieval
  console.log("\n--- Filtered Retrieval Test ---");
  const testBullet = sampleBullets[0];
  if (testBullet) {
    const mongoFiltered = await Bullet.find({
      userId: testBullet.userId,
      resumeId: testBullet.resumeId,
      embeddingModel: testBullet.embeddingModel,
    }).limit(5);

    const qdrantFiltered = await searchQdrant(testBullet.embedding, 5, {
      userId: testBullet.userId.toString(),
      resumeId: testBullet.resumeId.toString(),
      embeddingModel: testBullet.embeddingModel,
    });

    console.log(`MongoDB filtered count: ${mongoFiltered.length}`);
    console.log(`Qdrant filtered count: ${qdrantFiltered?.length || 0}`);

    const mongoIds = new Set(mongoFiltered.map(b => b._id.toString()));
    const qdrantIds = new Set((qdrantFiltered || []).map(r => r.bulletId));
    const overlap = [...qdrantIds].filter(id => mongoIds.has(id)).length;
    console.log(`Filter overlap: ${overlap}/${qdrantIds.size}`);
  }

  console.log("\n=== Validation Complete ===");

  await mongoose.disconnect();
};

validate().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
