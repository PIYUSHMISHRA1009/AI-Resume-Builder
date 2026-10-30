/**
 * MongoDB Vector Search Benchmark Runner
 *
 * REAL DATABASE STATUS: Atlas Vector Search is UNAVAILABLE on this cluster.
 * This runner falls back to an in-memory exact-search simulation that is
 * explicitly labeled as such.
 *
 * If Atlas Vector Search becomes available, update `useAtlas` to true
 * and ensure the index exists.
 */

import mongoose from "mongoose";
import { BENCHMARK_CONFIG } from "./benchmark.config.js";
import { generateBenchmarkDataset, generateBenchmarkQueries, exportVectorsForDatabase, computeVectorChecksum } from "./generateDataset.js";

const { mongodb, topK, defaultTopK, embeddingDimension } = BENCHMARK_CONFIG;

const BulletSchema = new mongoose.Schema({
  bulletId: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  resumeId: { type: String, index: true },
  text: { type: String, required: true },
  source: { type: String, enum: ["summary", "skill", "experience", "project"], index: true },
  embedding: { type: [Number] },
  embeddingModel: { type: String, index: true },
  embeddingDimension: { type: Number },
});

const Bullet = mongoose.model("BenchmarkBullet", BulletSchema, mongodb.collection);

// --- Similarity and metrics utilities ---

export const cosineSimilarity = (vecA, vecB) => {
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

export const exactTopK = (queryEmbedding, allDocs, k, filter) => {
  const filtered = filter
    ? allDocs.filter((d) => {
        if (filter.userId && d.userId?.toString() !== filter.userId) return false;
        if (filter.resumeId && d.resumeId?.toString() !== filter.resumeId) return false;
        if (filter.embeddingModel && d.embeddingModel !== filter.embeddingModel) return false;
        return true;
      })
    : allDocs;

  const scored = filtered
    .map((doc) => ({
      bulletId: doc.bulletId,
      text: doc.text,
      source: doc.source,
      score: cosineSimilarity(queryEmbedding, doc.embedding || []),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored;
};

export const computeGroundTruth = (queries, allDocs, filterGetter) => {
  return queries.map((q) => {
    const filter = filterGetter ? filterGetter(q) : {};
    return {
      query: q.text,
      topic: q.topic,
      exactTop10: exactTopK(q.embedding, allDocs, 10, filter).map((s) => ({
        bulletId: s.bulletId,
        score: s.score,
      })),
    };
  });
};

export const computeRetrievalMetrics = (groundTruth, dbResults, topKValues) => {
  const metrics = {};

  for (const k of topKValues) {
    let recallSum = 0;
    let mrrSum = 0;
    let ndcgSum = 0;
    let hitRateSum = 0;
    const overlaps = [];

    for (let i = 0; i < groundTruth.length; i++) {
      const gt = groundTruth[i].exactTop10.slice(0, k).map((s) => s.bulletId);
      const db = (dbResults[i]?.results?.[k]?.hits || []).slice(0, k).map((s) => s.bulletId);

      const gtSet = new Set(gt);
      const dbSet = new Set(db);

      const hits = db.filter((id) => gtSet.has(id)).length;
      recallSum += hits / gt.length;

      const overlap = hits / k;
      overlaps.push(overlap);

      if (db.length > 0 && gtSet.has(db[0])) {
        mrrSum += 1;
      } else if (db.some((id) => gtSet.has(id))) {
        const rank = db.findIndex((id) => gtSet.has(id)) + 1;
        mrrSum += 1 / rank;
      }

      let dcg = 0;
      for (let j = 0; j < db.length; j++) {
        const rel = gtSet.has(db[j]) ? 1 : 0;
        dcg += rel / Math.log2(j + 2);
      }
      const idealOrder = gt.slice(0, db.length);
      let idcg = 0;
      for (let j = 0; j < idealOrder.length; j++) {
        idcg += 1 / Math.log2(j + 2);
      }
      ndcgSum += idcg > 0 ? dcg / idcg : 0;

      if (hits > 0) hitRateSum += 1;
    }

    metrics[`recall@${k}`] = recallSum / groundTruth.length;
    metrics[`mrr@${k}`] = mrrSum / groundTruth.length;
    metrics[`ndcg@${k}`] = ndcgSum / groundTruth.length;
    metrics[`hitRate@${k}`] = hitRateSum / groundTruth.length;
    metrics[`overlap@${k}`] = overlaps.reduce((a, b) => a + b, 0) / overlaps.length;
  }

  return metrics;
};

// --- In-memory search implementation (fallback) ---

const inMemoryVectorSearch = async (queryEmbedding, k, filter) => {
  const allDocs = await Bullet.find(filter || {}).lean();
  return exactTopK(queryEmbedding, allDocs, k, filter).map((doc) => ({
    bulletId: doc.bulletId,
    text: doc.text,
    source: doc.source,
    score: doc.score,
  }));
};

// --- Atlas Vector Search implementation (unavailable on this cluster) ---

const atlasVectorSearch = async (queryEmbedding, k, filter) => {
  const pipeline = [
    {
      $vectorSearch: {
        index: mongodb.indexName,
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: Math.max(100, k * 10),
        limit: k,
        filter,
      },
    },
    {
      $project: {
        bulletId: { $toString: "$_id" },
        text: 1,
        source: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];
  const results = await Bullet.aggregate(pipeline);
  return results.map((r) => ({
    bulletId: r.bulletId,
    text: r.text,
    source: r.source,
    score: r.score || 0,
  }));
};

// --- Main benchmark runner ---

export const runMongoDBBenchmark = async (dataset, queries, groundTruth) => {
  const results = {
    retrieval: {},
    latency: {},
    throughput: {},
    filtering: {},
    overlap: {},
    scale: {},
    concurrency: {},
    indexing: {},
    metadata: {
      vectorCount: dataset.length,
      dimensions: embeddingDimension,
      checksum: computeVectorChecksum(dataset),
      mode: "ATLAS_VECTOR_SEARCH_UNAVAILABLE",
      note: "Using in-memory exact cosine search simulation. NOT representative of MongoDB Atlas Vector Search.",
    },
  };

  // Ensure benchmark collection is clean
  await Bullet.deleteMany({});

  // Try to create Atlas Vector Search index
  let atlasAvailable = false;
  try {
    await mongoose.connection.db.collection(mongodb.collection).createIndex(
      { [mongodb.vectorField]: "cosmosSearch" },
      {
        name: mongodb.indexName,
        cosmosSearch: {
          kind: "vector-ivf",
          numLists: 10,
          dimensions: embeddingDimension,
          similarity: "COS",
        },
      }
    );
    console.log(`  [MongoDB] Created Atlas Vector Search index: ${mongodb.indexName}`);
    atlasAvailable = true;
    results.metadata.mode = "ATLAS_VECTOR_SEARCH_AVAILABLE";
    results.metadata.note = "Using real MongoDB Atlas Vector Search.";
  } catch (err) {
    console.log(`  [MongoDB] Atlas Vector Search unavailable: ${err.message.split("::")[0]?.trim() || err.message}`);
  }

  // Insert benchmark dataset
  const insertStart = Date.now();
  await Bullet.insertMany(dataset.map((d) => ({
    bulletId: d.bulletId,
    userId: d.userId,
    resumeId: d.resumeId,
    text: d.text,
    source: d.source,
    embedding: d.embedding,
    embeddingModel: d.embeddingModel,
    embeddingDimension: d.embeddingDimension,
  })));
  results.indexing.insertMs = Date.now() - insertStart;
  console.log(`  [MongoDB] Inserted ${dataset.length} vectors in ${results.indexing.insertMs}ms`);

  const useAtlas = atlasAvailable;
  const filter = { embeddingModel: "gemini-embedding-2" };

  // --- Retrieval quality and latency ---
  const dbResults = queries.map((q) => ({ query: q.text, results: {} }));
  for (const k of topK) {
    const latencies = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const start = Date.now();
      const hits = useAtlas
        ? await atlasVectorSearch(query.embedding, k, { ...filter, userId: query.userId })
        : await inMemoryVectorSearch(query.embedding, k, { ...filter, userId: query.userId });
      const latency = Date.now() - start;
      latencies.push(latency);
      dbResults[i].results[k] = { hits, latency };
    }

    const sorted = latencies.sort((a, b) => a - b);
    results.latency[k] = {
      min: sorted[0],
      avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
    results.throughput[k] = { qps: 1000 / results.latency[k].avg };
  }

  // Compute retrieval quality metrics against ground truth
  const qualityMetrics = computeRetrievalMetrics(groundTruth, dbResults, topK);
  results.retrieval = qualityMetrics;

  // --- Filtered search ---
  const filterQueries = queries.slice(0, 5);
  for (const filterType of ["none", "userId", "resumeId", "userId+resumeId"]) {
    const latencies = [];
    for (const query of filterQueries) {
      let mFilter = {};
      if (filterType === "userId") mFilter = { ...filter, userId: query.userId };
      else if (filterType === "resumeId") mFilter = { ...filter, resumeId: query.resumeId };
      else if (filterType === "userId+resumeId") mFilter = { ...filter, userId: query.userId, resumeId: query.resumeId };

      const start = Date.now();
      await inMemoryVectorSearch(query.embedding, defaultTopK, mFilter);
      latencies.push(Date.now() - start);
    }
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    results.filtering[filterType] = { avgLatency: avg, queries: filterQueries.length };
  }

  // --- Concurrency ---
  for (const concurrencyLevel of BENCHMARK_CONFIG.concurrency) {
    const start = Date.now();
    let success = 0, failed = 0;
    const batchLatencies = [];

    const tasks = [];
    for (let i = 0; i < concurrencyLevel; i++) {
      tasks.push(
        (async () => {
          const qStart = Date.now();
          try {
            await inMemoryVectorSearch(queries[i % queries.length].embedding, defaultTopK, { ...filter, userId: queries[i % queries.length].userId });
            success++;
            batchLatencies.push(Date.now() - qStart);
          } catch {
            failed++;
          }
        })()
      );
    }
    await Promise.all(tasks);
    const totalMs = Date.now() - start;
    results.concurrency[`${concurrencyLevel}`] = {
      total: concurrencyLevel,
      success,
      failed,
      totalMs,
      avgLatency: batchLatencies.reduce((a, b) => a + b, 0) / batchLatencies.length,
      qps: success / (totalMs / 1000),
    };
  }

  return results;
};

export const cleanupMongoDBBenchmark = async () => {
  await Bullet.deleteMany({});
  console.log("  [MongoDB] Cleaned up benchmark collection");
};
