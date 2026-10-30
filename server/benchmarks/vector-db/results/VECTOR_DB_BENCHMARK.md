# Vector Database Benchmark

**Generated:** 2026-08-27T14:40:42.745Z
**Duration:** 250919ms

## 1. Executive Summary

**Recommendation: C. MORE DATA NEEDED**

Neither MongoDB Atlas Vector Search nor Qdrant was available in this environment. The benchmark was executed as a controlled in-memory simulation with identical vectors and independent ground truth. No real database performance comparison was possible. To make a migration decision, run this benchmark against real Atlas Vector Search and real Qdrant instances.

## 2. Current Production Architecture

- **Database:** MongoDB Atlas (document store)
- **Vector Search:** Atlas Vector Search (`$vectorSearch`) with fallback to in-memory cosine
- **Embedding Model:** `gemini-embedding-2`
- **Dimensions:** 3072
- **Similarity Metric:** Cosine
- **Top-K:** 5 (configurable)
- **Filters:** `userId`, `resumeId`, `embeddingModel`

## 3. Benchmark Architecture

- **Directory:** `server/benchmarks/vector-db/`
- **Isolation:** No production code, schemas, or data modified
- **Dataset:** Synthetic 3072-dimensional vectors (deterministic seed)
- **Queries:** 20 Resume ↔ JD use-case queries
- **Ground Truth:** Exact cosine similarity against full dataset

### Real Database Availability

| System | Status |
|--------|--------|
| MongoDB Atlas Vector Search | ATLAS_VECTOR_SEARCH_UNAVAILABLE |
| Qdrant | QDRANT_UNAVAILABLE |

## 4. Environment

- **MongoDB Version:** 8.0.29 (Atlas)
- **Node.js:** v22.23.0
- **Docker:** 29.2.0 (daemon not running — Qdrant unavailable)
- **Atlas Vector Search:** Not detected on cluster

## 5. Dataset

- **Vectors:** 1,000
- **Dimensions:** 3072
- **Checksum:** sha1-like:54fe791d
- **Queries:** 20
- **Distance Metric:** cosine

Both MongoDB and Qdrant benchmark runs received the **exact same vectors**.

## 6. Ground Truth Methodology

1. For each query, compute exact cosine similarity against **all** benchmark vectors.
2. Sort by descending similarity.
3. Store the exact Top-10 ranking as ground truth.
4. Evaluate both MongoDB and Qdrant results against this same ground truth.

Ground truth is **independent** of both database retrievers.

## 7. Retrieval Quality

| Metric | MongoDB | Qdrant |
|--------|---------|--------|
| recall@1 | 1.0000 | 1.0000 |
| recall@3 | 1.0000 | 1.0000 |
| recall@5 | 1.0000 | 1.0000 |
| recall@10 | 1.0000 | 1.0000 |
| mrr@1 | 1.0000 | 1.0000 |
| mrr@5 | 1.0000 | 1.0000 |
| mrr@10 | 1.0000 | 1.0000 |
| ndcg@1 | 1.0000 | 1.0000 |
| ndcg@5 | 1.0000 | 1.0000 |
| ndcg@10 | 1.0000 | 1.0000 |
| hitRate@1 | 1.0000 | 1.0000 |
| hitRate@5 | 1.0000 | 1.0000 |
| hitRate@10 | 1.0000 | 1.0000 |
| overlap@1 | 1.0000 | 1.0000 |
| overlap@5 | 1.0000 | 1.0000 |
| overlap@10 | 1.0000 | 1.0000 |

## 8. Result Overlap

Overlap measures the percentage of retrieved documents that are also in the ground truth Top-K.

| Top K | MongoDB Overlap | Qdrant Overlap |
|-------|-----------------|----------------|
| 1 | 1.0000 | 1.0000 |
| 3 | 1.0000 | 1.0000 |
| 5 | 1.0000 | 1.0000 |
| 10 | 1.0000 | 1.0000 |

## 9. Unfiltered Latency

| Top K | System | Min (ms) | Avg (ms) | P50 (ms) | P95 (ms) | P99 (ms) | QPS |
|-------|--------|----------|----------|----------|----------|----------|-----|
| 1 | MongoDB | 1175.00 | 1901.60 | 1557.00 | 3687.00 | 3687.00 | 0.53 |
| 1 | Qdrant | 0.00 | 4.90 | 4.00 | 18.00 | 18.00 | 204.08 |
| 3 | MongoDB | 1183.00 | 1279.35 | 1239.00 | 1710.00 | 1710.00 | 0.78 |
| 3 | Qdrant | 0.00 | 1.00 | 1.00 | 5.00 | 5.00 | 1000.00 |
| 5 | MongoDB | 1155.00 | 1257.55 | 1245.00 | 1429.00 | 1429.00 | 0.80 |
| 5 | Qdrant | 0.00 | 0.75 | 1.00 | 1.00 | 1.00 | 1333.33 |
| 10 | MongoDB | 1206.00 | 1357.75 | 1283.00 | 1840.00 | 1840.00 | 0.74 |
| 10 | Qdrant | 0.00 | 0.75 | 1.00 | 1.00 | 1.00 | 1333.33 |

## 10. Filtered Latency

| Filter Type | MongoDB Avg (ms) | Qdrant Avg (ms) |
|-------------|------------------|------------------|
| none | 15611.80 | 6.80 |
| userId | 1284.00 | 0.80 |
| resumeId | 677.60 | 0.40 |
| userId+resumeId | 607.40 | 0.40 |

## 11. Concurrency

| Level | System | Success | Failed | Total (ms) | Avg Latency (ms) | QPS |
|-------|--------|---------|--------|------------|------------------|-----|
| 1 | MongoDB | 1 | 0 | 1258 | 1258.00 | 0.79 |
| 1 | Qdrant | 1 | 0 | 0 | 0.00 | Infinity |
| 5 | MongoDB | 5 | 0 | 6965 | 4946.20 | 0.72 |
| 5 | Qdrant | 5 | 0 | 4 | 2.20 | 1250.00 |
| 10 | MongoDB | 10 | 0 | 12182 | 10589.10 | 0.82 |
| 10 | Qdrant | 10 | 0 | 7 | 3.80 | 1428.57 |

## 12. Scale Testing

| Vectors | Index (ms) | Avg Query (ms) | P50 (ms) | P95 (ms) | P99 (ms) | QPS |
|---------|------------|----------------|----------|----------|----------|-----|
| 10,000 | 952 | 17.60 | 7.00 | 57.00 | 57.00 | 56.82 |
| 100,000 | 975 | 25.40 | 8.00 | 94.00 | 94.00 | 39.37 |

*Scale data is purely synthetic and does not represent production workload.*

## 13. Indexing Performance

| System | Insert Time (ms) |
|--------|------------------|
| MongoDB | 16148 |
| Qdrant | N/A (in-memory simulation) |

## 14. Limitations

1. **MongoDB Atlas Vector Search unavailable:** The benchmark used in-memory exact cosine search instead of real Atlas Vector Search ANN. Atlas ANN latency, recall-vs-latency tradeoffs, and filter pushdown behavior cannot be measured.
2. **Qdrant unavailable:** The benchmark used in-memory exact cosine search with payload filtering instead of real Qdrant. Qdrant's HNSW indexing, network latency, and batching behavior cannot be measured.
3. **Synthetic data:** Vectors are randomly generated with topic centroids, not real Gemini embeddings from production resumes. Real embedding distribution, sparsity, and semantic structure are not represented.
4. **Small scale:** 1,000 vectors is far smaller than production workloads at scale. Memory-only search does not reflect disk-backed ANN behavior.
5. **Single-run measurements:** Latency variance due to CPU scheduling, JIT warmup, and GC was not characterized.
6. **No cost measurement:** Cloud pricing, storage, and operational overhead were not measured.

## 15. Recommendation

**C. MORE DATA NEEDED**

A scientifically valid migration decision requires:

1. A MongoDB Atlas cluster with Vector Search enabled.
2. A running Qdrant instance (local or cloud).
3. Real production-derived embeddings (or realistic synthetic replacements).
4. Measured recall-vs-latency curves at multiple index configurations.
5. Filtered search benchmarks with production query patterns.
6. Operational cost and latency SLAs under real concurrency.

Until these are available, the current Career Intelligence architecture using MongoDB with in-memory cosine fallback should remain unchanged.
