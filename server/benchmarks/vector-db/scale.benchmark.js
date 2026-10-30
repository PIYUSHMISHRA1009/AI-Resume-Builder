/**
 * Scale Benchmark Runner
 *
 * Tests indexing and query performance at larger scales using
 * purely synthetic data. NEVER touches production.
 */

import { BENCHMARK_CONFIG } from "./benchmark.config.js";
import { generateBenchmarkDataset, generateBenchmarkQueries, computeVectorChecksum } from "./generateDataset.js";
import { cosineSimilarity } from "./mongodb.benchmark.js";

const { scaleSizes, defaultTopK, embeddingDimension } = BENCHMARK_CONFIG;

const runScaleBenchmark = async (queries) => {
  const results = {};

  for (const size of scaleSizes) {
    console.log(`\n  [Scale] Running with ${size.toLocaleString()} vectors...`);
    const dataset = generateBenchmarkDataset().slice(0, size);
    const points = dataset.map((doc, idx) => ({
      id: idx,
      vector: doc.embedding,
      payload: {
        bulletId: doc.bulletId,
        userId: doc.userId.toString(),
        resumeId: doc.resumeId.toString(),
        text: doc.text,
        source: doc.source,
        embeddingModel: doc.embeddingModel,
        embeddingDimension: doc.embeddingDimension,
      },
    }));

    // Indexing time (just array construction + checksum for simulation)
    const indexStart = Date.now();
    const checksum = computeVectorChecksum(dataset);
    const indexMs = Date.now() - indexStart;

    // Query latency
    const latencies = [];
    const testQueries = queries.slice(0, Math.min(5, queries.length));
    for (const query of testQueries) {
      const start = Date.now();
      const hits = points
        .map((p) => ({
          ...p,
          score: cosineSimilarity(query.embedding, p.vector),
        }))
        .filter((p) => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, defaultTopK);
      latencies.push(Date.now() - start);
    }

    const sorted = latencies.sort((a, b) => a - b);
    results[size] = {
      vectorCount: size,
      checksum,
      indexMs,
      queryCount: testQueries.length,
      latency: {
        min: sorted[0],
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      },
      qps: 1000 / (latencies.reduce((a, b) => a + b, 0) / latencies.length),
      note: "Synthetic scale data. Does not represent production workload.",
    };
  }

  return results;
};

export { runScaleBenchmark };
