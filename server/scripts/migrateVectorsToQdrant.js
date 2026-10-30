/**
 * Migrate existing MongoDB Bullet vectors to Qdrant.
 *
 * This script:
 * 1. Reads existing Bullet documents from MongoDB
 * 2. Selects bullets with valid embeddings
 * 3. Uploads existing embeddings to Qdrant (does NOT generate new embeddings)
 * 4. Is idempotent
 * 5. Never deletes MongoDB vectors
 *
 * Usage:
 *   node scripts/migrateVectorsToQdrant.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Bullet from "../models/Bullet.js";
import { initQdrant, upsertToQdrant } from "../services/vectorStore/index.js";

dotenv.config();

const BATCH_SIZE = 100;

const migrate = async () => {
  const mongodbUri = process.env.MONGODB_URI?.replace(/^["']|["'];?$/g, "").trim();
  if (!mongodbUri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongodbUri, { dbName: "resume-builder" });
  console.log("Connected to MongoDB");

  // Initialize Qdrant
  console.log("Initializing Qdrant...");
  await initQdrant();

  const Bullet = mongoose.model("Bullet");
  
  // Count total eligible bullets
  const totalCount = await Bullet.countDocuments({
    embedding: { $exists: true, $ne: [] },
    embeddingModel: process.env.EMBEDDING_MODEL || "gemini-embedding-2",
    embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSIONS || "3072"),
  });

  console.log(`Total eligible bullets: ${totalCount}`);

  if (totalCount === 0) {
    console.log("No bullets to migrate.");
    await mongoose.disconnect();
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches
  const cursor = Bullet.find({
    embedding: { $exists: true, $ne: [] },
    embeddingModel: process.env.EMBEDDING_MODEL || "gemini-embedding-2",
    embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSIONS || "3072"),
  }).cursor();

  const batch = [];
  for await (const doc of cursor) {
    batch.push(doc);

    if (batch.length >= BATCH_SIZE) {
      // Process batch
      const points = batch.map((doc) => ({
        bulletId: doc._id.toString(),
        vector: doc.embedding,
        payload: {
          userId: doc.userId?.toString(),
          resumeId: doc.resumeId?.toString(),
          text: doc.text,
          source: doc.source,
          embeddingModel: doc.embeddingModel,
          embeddingDimension: doc.embeddingDimension,
          metadata: doc.metadata || {},
        },
      }));

      for (const point of points) {
        try {
          await upsertToQdrant(point.bulletId, point.vector, point.payload);
          migrated++;
        } catch (err) {
          console.error(`Failed to migrate bullet ${point.bulletId}:`, err.message);
          failed++;
        }
      }

      // Clear batch
      batch.length = 0;
      
      // Progress
      if ((migrated + skipped + failed) % 100 === 0) {
        console.log(`Progress: ${migrated + skipped + failed}/${totalCount}`);
      }
    }
  }

  // Process remaining batch
  if (batch.length > 0) {
    const points = batch.map((doc) => ({
      bulletId: doc._id.toString(),
      vector: doc.embedding,
      payload: {
        userId: doc.userId?.toString(),
        resumeId: doc.resumeId?.toString(),
        text: doc.text,
        source: doc.source,
        embeddingModel: doc.embeddingModel,
        embeddingDimension: doc.embeddingDimension,
        metadata: doc.metadata || {},
      },
    }));

    for (const point of points) {
      try {
        await upsertToQdrant(point.bulletId, point.vector, point.payload);
        migrated++;
      } catch (err) {
        console.error(`Failed to migrate bullet ${point.bulletId}:`, err.message);
        failed++;
      }
    }
  }

  console.log("\n=== Migration Summary ===");
  console.log(`Total eligible: ${totalCount}`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
};

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
