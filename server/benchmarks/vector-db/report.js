/**
 * Comprehensive Benchmark Report Generator
 *
 * Produces JSON, Markdown, and CSV reports with all required sections.
 */

import { BENCHMARK_CONFIG } from "./benchmark.config.js";

const fmt = (v, digits = 2) => {
  if (v === undefined || v === null) return "N/A";
  return Number(v).toFixed(digits);
};

export const generateReport = ({ mongodb, qdrant, scale, config, duration }) => {
  const m = mongodb;
  const q = qdrant;

  // --- JSON ---
  const json = {
    metadata: {
      timestamp: new Date().toISOString(),
      durationMs: duration,
      config: {
        vectorCount: config.vectorCount,
        embeddingDimension: config.embeddingDimension,
        topK: config.topK,
        queryCount: config.queryCount,
        distanceMetric: config.distanceMetric,
      },
    },
    environment: {
      mongodbAtlasVectorSearch: "UNAVAILABLE",
      qdrant: "UNAVAILABLE",
      simulation: true,
    },
    dataset: {
      vectorCount: m.metadata.vectorCount,
      dimensions: m.metadata.dimensions,
      checksum: m.metadata.checksum,
      queries: config.queryCount,
    },
    groundTruth: {
      methodology: "Exact cosine similarity against full benchmark dataset (in-memory brute-force)",
      note: "Independent of both database retrievers",
    },
    mongodb: m,
    qdrant: q,
    scale: scale || {},
  };

  // --- Markdown ---
  const md = [];
  md.push("# Vector Database Benchmark");
  md.push("");
  md.push(`**Generated:** ${new Date().toISOString()}`);
  md.push(`**Duration:** ${duration}ms`);
  md.push("");

  // 1. Executive Summary
  md.push("## 1. Executive Summary");
  md.push("");
  md.push("**Recommendation: C. MORE DATA NEEDED**");
  md.push("");
  md.push("Neither MongoDB Atlas Vector Search nor Qdrant was available in this environment. The benchmark was executed as a controlled in-memory simulation with identical vectors and independent ground truth. No real database performance comparison was possible. To make a migration decision, run this benchmark against real Atlas Vector Search and real Qdrant instances.");
  md.push("");

  // 2. Current Production Architecture
  md.push("## 2. Current Production Architecture");
  md.push("");
  md.push("- **Database:** MongoDB Atlas (document store)");
  md.push("- **Vector Search:** Atlas Vector Search (`$vectorSearch`) with fallback to in-memory cosine");
  md.push("- **Embedding Model:** `gemini-embedding-2`");
  md.push("- **Dimensions:** 3072");
  md.push("- **Similarity Metric:** Cosine");
  md.push("- **Top-K:** 5 (configurable)");
  md.push("- **Filters:** `userId`, `resumeId`, `embeddingModel`");
  md.push("");

  // 3. Benchmark Architecture
  md.push("## 3. Benchmark Architecture");
  md.push("");
  md.push("- **Directory:** `server/benchmarks/vector-db/`");
  md.push("- **Isolation:** No production code, schemas, or data modified");
  md.push("- **Dataset:** Synthetic 3072-dimensional vectors (deterministic seed)");
  md.push("- **Queries:** 20 Resume ↔ JD use-case queries");
  md.push("- **Ground Truth:** Exact cosine similarity against full dataset");
  md.push("");
  md.push("### Real Database Availability");
  md.push("");
  md.push("| System | Status |");
  md.push("|--------|--------|");
  md.push(`| MongoDB Atlas Vector Search | ${m.metadata.mode} |`);
  md.push(`| Qdrant | ${q.metadata.mode} |`);
  md.push("");

  // 4. Environment
  md.push("## 4. Environment");
  md.push("");
  md.push("- **MongoDB Version:** 8.0.29 (Atlas)");
  md.push("- **Node.js:** v22.23.0");
  md.push("- **Docker:** 29.2.0 (daemon not running — Qdrant unavailable)");
  md.push("- **Atlas Vector Search:** Not detected on cluster");
  md.push("");

  // 5. Dataset
  md.push("## 5. Dataset");
  md.push("");
  md.push(`- **Vectors:** ${m.metadata.vectorCount.toLocaleString()}`);
  md.push(`- **Dimensions:** ${m.metadata.dimensions}`);
  md.push(`- **Checksum:** ${m.metadata.checksum}`);
  md.push(`- **Queries:** ${config.queryCount}`);
  md.push(`- **Distance Metric:** ${config.distanceMetric}`);
  md.push("");
  md.push("Both MongoDB and Qdrant benchmark runs received the **exact same vectors**.");
  md.push("");

  // 6. Ground Truth Methodology
  md.push("## 6. Ground Truth Methodology");
  md.push("");
  md.push("1. For each query, compute exact cosine similarity against **all** benchmark vectors.");
  md.push("2. Sort by descending similarity.");
  md.push("3. Store the exact Top-10 ranking as ground truth.");
  md.push("4. Evaluate both MongoDB and Qdrant results against this same ground truth.");
  md.push("");
  md.push("Ground truth is **independent** of both database retrievers.");
  md.push("");

  // 7. Retrieval Quality
  md.push("## 7. Retrieval Quality");
  md.push("");
  md.push("| Metric | MongoDB | Qdrant |");
  md.push("|--------|---------|--------|");

  const metricsToShow = [
    "recall@1", "recall@3", "recall@5", "recall@10",
    "mrr@1", "mrr@5", "mrr@10",
    "ndcg@1", "ndcg@5", "ndcg@10",
    "hitRate@1", "hitRate@5", "hitRate@10",
    "overlap@1", "overlap@5", "overlap@10",
  ];

  for (const metric of metricsToShow) {
    const mv = m.retrieval[metric];
    const qv = q.retrieval[metric];
    md.push(`| ${metric} | ${fmt(mv, 4)} | ${fmt(qv, 4)} |`);
  }
  md.push("");

  // 8. Result Overlap
  md.push("## 8. Result Overlap");
  md.push("");
  md.push("Overlap measures the percentage of retrieved documents that are also in the ground truth Top-K.");
  md.push("");
  md.push("| Top K | MongoDB Overlap | Qdrant Overlap |");
  md.push("|-------|-----------------|----------------|");
  for (const k of config.topK) {
    const key = `overlap@${k}`;
    md.push(`| ${k} | ${fmt(m.retrieval[key], 4)} | ${fmt(q.retrieval[key], 4)} |`);
  }
  md.push("");

  // 9. Unfiltered Latency
  md.push("## 9. Unfiltered Latency");
  md.push("");
  md.push("| Top K | System | Min (ms) | Avg (ms) | P50 (ms) | P95 (ms) | P99 (ms) | QPS |");
  md.push("|-------|--------|----------|----------|----------|----------|----------|-----|");
  for (const k of config.topK) {
    const ml = m.latency[k];
    const ql = q.latency[k];
    md.push(`| ${k} | MongoDB | ${fmt(ml.min)} | ${fmt(ml.avg)} | ${fmt(ml.p50)} | ${fmt(ml.p95)} | ${fmt(ml.p99)} | ${fmt(ml.avg ? 1000/ml.avg : 0)} |`);
    md.push(`| ${k} | Qdrant | ${fmt(ql.min)} | ${fmt(ql.avg)} | ${fmt(ql.p50)} | ${fmt(ql.p95)} | ${fmt(ql.p99)} | ${fmt(ql.avg ? 1000/ql.avg : 0)} |`);
  }
  md.push("");

  // 10. Filtered Latency
  md.push("## 10. Filtered Latency");
  md.push("");
  md.push("| Filter Type | MongoDB Avg (ms) | Qdrant Avg (ms) |");
  md.push("|-------------|------------------|------------------|");
  for (const ft of ["none", "userId", "resumeId", "userId+resumeId"]) {
    const mv = m.filtering[ft]?.avgLatency;
    const qv = q.filtering[ft]?.avgLatency;
    md.push(`| ${ft} | ${fmt(mv)} | ${fmt(qv)} |`);
  }
  md.push("");

  // 11. Concurrency
  md.push("## 11. Concurrency");
  md.push("");
  md.push("| Level | System | Success | Failed | Total (ms) | Avg Latency (ms) | QPS |");
  md.push("|-------|--------|---------|--------|------------|------------------|-----|");
  for (const level of config.concurrency) {
    const mc = m.concurrency[`${level}`];
    const qc = q.concurrency[`${level}`];
    md.push(`| ${level} | MongoDB | ${mc.success} | ${mc.failed} | ${fmt(mc.totalMs, 0)} | ${fmt(mc.avgLatency)} | ${fmt(mc.qps)} |`);
    md.push(`| ${level} | Qdrant | ${qc.success} | ${qc.failed} | ${fmt(qc.totalMs, 0)} | ${fmt(qc.avgLatency)} | ${fmt(qc.qps)} |`);
  }
  md.push("");

  // 12. Scale Testing
  md.push("## 12. Scale Testing");
  md.push("");
  md.push("| Vectors | Index (ms) | Avg Query (ms) | P50 (ms) | P95 (ms) | P99 (ms) | QPS |");
  md.push("|---------|------------|----------------|----------|----------|----------|-----|");
  if (scale) {
    for (const [size, data] of Object.entries(scale)) {
      md.push(`| ${Number(size).toLocaleString()} | ${fmt(data.indexMs, 0)} | ${fmt(data.latency.avg)} | ${fmt(data.latency.p50)} | ${fmt(data.latency.p95)} | ${fmt(data.latency.p99)} | ${fmt(data.qps)} |`);
    }
  } else {
    md.push("| — | Scale benchmark not executed | — | — | — | — | — |");
  }
  md.push("");
  md.push("*Scale data is purely synthetic and does not represent production workload.*");
  md.push("");

  // 13. Indexing Performance
  md.push("## 13. Indexing Performance");
  md.push("");
  md.push("| System | Insert Time (ms) |");
  md.push("|--------|------------------|");
  md.push(`| MongoDB | ${fmt(m.indexing.insertMs, 0)} |`);
  md.push(`| Qdrant | N/A (in-memory simulation) |`);
  md.push("");

  // 14. Limitations
  md.push("## 14. Limitations");
  md.push("");
  md.push("1. **MongoDB Atlas Vector Search unavailable:** The benchmark used in-memory exact cosine search instead of real Atlas Vector Search ANN. Atlas ANN latency, recall-vs-latency tradeoffs, and filter pushdown behavior cannot be measured.");
  md.push("2. **Qdrant unavailable:** The benchmark used in-memory exact cosine search with payload filtering instead of real Qdrant. Qdrant's HNSW indexing, network latency, and batching behavior cannot be measured.");
  md.push("3. **Synthetic data:** Vectors are randomly generated with topic centroids, not real Gemini embeddings from production resumes. Real embedding distribution, sparsity, and semantic structure are not represented.");
  md.push("4. **Small scale:** 1,000 vectors is far smaller than production workloads at scale. Memory-only search does not reflect disk-backed ANN behavior.");
  md.push("5. **Single-run measurements:** Latency variance due to CPU scheduling, JIT warmup, and GC was not characterized.");
  md.push("6. **No cost measurement:** Cloud pricing, storage, and operational overhead were not measured.");
  md.push("");

  // 15. Recommendation
  md.push("## 15. Recommendation");
  md.push("");
  md.push("**C. MORE DATA NEEDED**");
  md.push("");
  md.push("A scientifically valid migration decision requires:");
  md.push("");
  md.push("1. A MongoDB Atlas cluster with Vector Search enabled.");
  md.push("2. A running Qdrant instance (local or cloud).");
  md.push("3. Real production-derived embeddings (or realistic synthetic replacements).");
  md.push("4. Measured recall-vs-latency curves at multiple index configurations.");
  md.push("5. Filtered search benchmarks with production query patterns.");
  md.push("6. Operational cost and latency SLAs under real concurrency.");
  md.push("");
  md.push("Until these are available, the current Career Intelligence architecture using MongoDB with in-memory cosine fallback should remain unchanged.");
  md.push("");

  // --- CSV ---
  const csv = [];
  csv.push("section,metric,system,top_k,value");
  for (const k of config.topK) {
    for (const sys of ["mongodb", "qdrant"]) {
      const l = sys === "mongodb" ? m.latency[k] : q.latency[k];
      csv.push(`latency,avg,${sys},${k},${l.avg}`);
      csv.push(`latency,p50,${sys},${k},${l.p50}`);
      csv.push(`latency,p95,${sys},${k},${l.p95}`);
      csv.push(`latency,p99,${sys},${k},${l.p99}`);
      csv.push(`throughput,qps,${sys},${k},${l.avg ? 1000/l.avg : 0}`);
      csv.push(`retrieval,recall,${sys},${k},${(sys === "mongodb" ? m.retrieval[`recall@${k}`] : q.retrieval[`recall@${k}`]) || 0}`);
      csv.push(`retrieval,overlap,${sys},${k},${(sys === "mongodb" ? m.retrieval[`overlap@${k}`] : q.retrieval[`overlap@${k}`]) || 0}`);
    }
  }

  return { json, markdown: md.join("\n"), csv: csv.join("\n"), duration };
};
