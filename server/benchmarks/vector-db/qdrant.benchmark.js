/**
 * Qdrant Vector Search Benchmark Runner
 *
 * REAL DATABASE STATUS: Qdrant is UNAVAILABLE.
 * This runner falls back to an in-memory exact-search simulation that is
 * explicitly labeled as such.
 *
 * If a Qdrant instance becomes available, replace the in-memory
 * implementation with actual @qdrant/js-client-rest calls.
 */

import { BENCHMARK_CONFIG } from "./benchmark.config.js";
import { generateBenchmarkDataset, generateBenchmarkQueries, exportVectorsForDatabase, computeVectorChecksum } from "./generateDataset.js";
import { cosineSimilarity, exactTopK, computeRetrievalMetrics } from "./mongodb.benchmark.js";

const { qdrant, topK, defaultTopK, embeddingDimension } = BENCHMARK_CONFIG;

const inMemoryQdrantSearch = async (points, queryEmbedding, k, filter) => {
  const filtered = filter
    ? points.filter((p) => {
        if (filter.must) {
          return filter.must.every((cond) => {
            if (cond.key && cond.match?.value !== undefined) {
              return p.payload[cond.key] === cond.match.value;
            }
            return true;
          });
        }
        return true;
      })
    : points;

  const scored = filtered
    .map((p) => ({
      bulletId: p.payload.bulletId,
      text: p.payload.text,
      source: p.payload.source,
      score: cosineSimilarity(queryEmbedding, p.vector),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored;
};

export const runQdrantBenchmark = async (dataset, queries, groundTruth) => {
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
      mode: "QDRANT_UNAVAILABLE",
      note: "Using in-memory exact cosine search simulation with Qdrant-style payload filtering. NOT representative of real Qdrant performance.",
    },
  };

  const points = exportVectorsForDatabase(dataset);
  console.log(`  [Qdrant] Prepared ${points.length} in-memory points (simulation)`);

  const dbResults = queries.map((q) => ({ query: q.text, results: {} }));
  for (const k of topK) {
    const latencies = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const start = Date.now();
      const hits = await inMemoryQdrantSearch(points, query.embedding, k, {
        must: [
          { key: "userId", match: { value: query.userId?.toString() } },
          { key: "embeddingModel", match: { value: "gemini-embedding-2" } },
        ],
      });
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

  const qualityMetrics = computeRetrievalMetrics(groundTruth, dbResults, topK);
  results.retrieval = qualityMetrics;

  // --- Filtered search ---
  const filterQueries = queries.slice(0, 5);
  for (const filterType of ["none", "userId", "resumeId", "userId+resumeId"]) {
    const latencies = [];
    for (const query of filterQueries) {
      let qFilter = null;
      if (filterType === "userId") qFilter = { must: [{ key: "userId", match: { value: query.userId?.toString() } }] };
      else if (filterType === "resumeId") qFilter = { must: [{ key: "resumeId", match: { value: query.resumeId?.toString() } }] };
      else if (filterType === "userId+resumeId") qFilter = { must: [
        { key: "userId", match: { value: query.userId?.toString() } },
        { key: "resumeId", match: { value: query.resumeId?.toString() } },
      ]};

      const start = Date.now();
      await inMemoryQdrantSearch(points, query.embedding, defaultTopK, qFilter);
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
            await inMemoryQdrantSearch(points, queries[i % queries.length].embedding, defaultTopK, {
              must: [{ key: "userId", match: { value: queries[i % queries.length].userId?.toString() } }],
            });
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

export const cleanupQdrantBenchmark = async () => {
  console.log("  [Qdrant] No cleanup needed for in-memory simulation");
};
