/**
 * Vector DB Benchmark Configuration
 *
 * IMPORTANT: This is an isolated, read-only benchmark.
 * It does NOT modify any production data or code.
 *
 * REAL DATABASE STATUS:
 * - MongoDB Atlas Vector Search: UNAVAILABLE on this cluster.
 * - Qdrant: UNAVAILABLE (Docker daemon not running).
 *
 * This benchmark currently runs as a methodology simulation.
 * All results must be interpreted as "simulation" until real
 * database instances are available.
 */

export const BENCHMARK_CONFIG = {
  // Dataset
  vectorCount: 1000,
  embeddingDimension: 3072,
  seed: 42,

  // Retrieval
  topK: [1, 3, 5, 10],
  defaultTopK: 5,

  // Queries (Resume ↔ JD use cases)
  queryCount: 20,
  queries: [
    "Python ETL data pipeline",
    "PostgreSQL database development",
    "Power BI dashboard analytics",
    "stakeholder management",
    "machine learning model development",
    "data warehouse architecture",
    "REST API development",
    "cloud infrastructure AWS",
    "Agile project management",
    "data visualization",
    "business intelligence",
    "software engineering best practices",
    "technical leadership",
    "cross-functional collaboration",
    "CI/CD pipeline automation",
    "microservices architecture",
    "data engineering",
    "full stack development",
    "quality assurance testing",
    "product management"
  ],

  // Concurrency levels to test
  concurrency: [1, 5, 10],

  // Scale test sizes (synthetic only, never touches production)
  scaleSizes: [10000, 100000],

  // MongoDB
  mongodb: {
    collection: "resume_bullets_benchmark",
    indexName: "benchmark_vector_index",
    vectorField: "embedding",
    filterFields: ["userId", "resumeId", "embeddingModel"],
  },

  // Qdrant
  qdrant: {
    collection: "resume_bullets_benchmark",
    vectorField: "embedding",
    payloadFields: ["userId", "resumeId", "embeddingModel", "text", "source"],
  },

  distanceMetric: "cosine",

  // Output
  outputDir: "./benchmarks/vector-db/results",
  jsonFile: "vector-db-benchmark-results.json",
  markdownFile: "VECTOR_DB_BENCHMARK.md",
  csvFile: "vector-db-benchmark-results.csv",
};
