/**
 * Backfill existing MongoDB Bullet vectors to Qdrant. Re-runs upsert stable
 * Qdrant point IDs and this script never deletes from either database.
 *
 * Usage:
 *   node scripts/migrateVectorsToQdrant.js [--dry-run] [--batch-size N]
 *     [--limit N] [--after-id OBJECT_ID] [--checkpoint PATH]
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import Bullet from "../models/Bullet.js";
import { initQdrant, upsertToQdrant } from "../services/vectorStore/index.js";

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;
const embeddingModel = process.env.EMBEDDING_MODEL || "gemini-embedding-2";
const embeddingDimension = Number.parseInt(process.env.EMBEDDING_DIMENSIONS || "3072", 10);

const readOption = (name) => {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const parsePositiveInteger = (value, fallback, maximum = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) return null;
  return parsed;
};

const main = async () => {
  const dryRun = process.argv.includes("--dry-run");
  const batchSize = parsePositiveInteger(readOption("batch-size"), DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE);
  const limit = parsePositiveInteger(readOption("limit"), null);
  const checkpointPath = readOption("checkpoint");
  const afterOption = readOption("after-id");

  if (!batchSize || (readOption("limit") !== undefined && !limit)) {
    console.error("Invalid batch size or limit");
    process.exitCode = 1;
    return;
  }
  if (!Number.isInteger(embeddingDimension) || embeddingDimension < 1) {
    console.error("Invalid EMBEDDING_DIMENSIONS");
    process.exitCode = 1;
    return;
  }

  let afterId = afterOption;
  if (!afterId && checkpointPath) {
    try {
      const checkpoint = JSON.parse(await fs.readFile(path.resolve(checkpointPath), "utf8"));
      afterId = checkpoint.afterId;
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Could not read migration checkpoint");
        process.exitCode = 1;
        return;
      }
    }
  }

  if (afterId && !mongoose.Types.ObjectId.isValid(afterId)) {
    console.error("Invalid after-id");
    process.exitCode = 1;
    return;
  }

  const mongodbUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/resume-builder";
  const query = {
    userId: { $exists: true, $ne: null },
    embedding: { $exists: true, $ne: [] },
    embeddingModel,
    embeddingDimension,
  };
  if (afterId) query._id = { $gt: new mongoose.Types.ObjectId(afterId) };

  try {
    await mongoose.connect(mongodbUri, { dbName: "resume-builder" });
    const eligibleCount = await Bullet.countDocuments(query);
    const plannedCount = limit === null ? eligibleCount : Math.min(limit, eligibleCount);

    if (dryRun) {
      console.log(`eligible bullets: ${plannedCount}`);
      return;
    }

    await initQdrant();
    const cursor = Bullet.find(query).sort({ _id: 1 }).limit(limit || 0).cursor();
    let processed = 0;
    let failed = 0;
    let batch = [];

    const saveCheckpoint = async (lastId) => {
      if (!checkpointPath) return;
      const absolutePath = path.resolve(checkpointPath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, JSON.stringify({ afterId: lastId.toString() }));
    };

    const flush = async () => {
      for (const doc of batch) {
        try {
          await upsertToQdrant(doc._id.toString(), doc.embedding, {
            userId: doc.userId.toString(),
            resumeId: doc.resumeId?.toString(),
            text: doc.text,
            source: doc.source,
            embeddingModel: doc.embeddingModel,
            embeddingDimension: doc.embeddingDimension,
            metadata: doc.metadata || {},
          });
          processed++;
          await saveCheckpoint(doc._id);
        } catch {
          failed++;
          break;
        }
      }
      batch = [];
      return failed === 0;
    };

    for await (const doc of cursor) {
      batch.push(doc);
      if (batch.length >= batchSize && !(await flush())) break;
    }
    if (batch.length > 0 && failed === 0) await flush();

    console.log(`processed: ${processed}`);
    console.log(`failed: ${failed}`);
    console.log(`remaining eligible: ${Math.max(0, eligibleCount - processed - failed)}`);
    if (failed > 0) process.exitCode = 1;
  } catch {
    console.error("Migration failed; check database configuration and connectivity");
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

main();
