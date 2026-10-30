/**
 * Generate synthetic benchmark data for vector DB comparison.
 *
 * IMPORTANT: This creates READ-ONLY synthetic data. No production
 * data is modified.
 *
 * Vectors are deterministic (seeded) and IDENTICAL for both
 * MongoDB and Qdrant benchmark runs.
 */

import { BENCHMARK_CONFIG } from "./benchmark.config.js";

const { vectorCount, embeddingDimension, seed, queries, queryCount } = BENCHMARK_CONFIG;

// Deterministic pseudo-random based on seed
let seedState = seed;
const seededRandom = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
};

const randomVector = (dim) => {
  const vec = new Array(dim);
  let sum = 0;
  for (let i = 0; i < dim; i++) {
    const val = seededRandom() * 2 - 1;
    vec[i] = val;
    sum += val * val;
  }
  const norm = Math.sqrt(sum);
  return vec.map((v) => v / norm);
};

// Topic-specific vocabulary for realistic resume bullets
const topicTemplates = {
  python: [
    "Developed Python ETL pipelines processing {n}M+ records daily",
    "Built Python microservices with Flask and FastAPI",
    "Implemented Python data validation frameworks",
    "Automated data workflows using Python scripts",
  ],
  sql: [
    "Optimized PostgreSQL queries reducing latency by {n}0%",
    "Designed SQL database schemas for enterprise applications",
    "Built data warehouse architecture on PostgreSQL",
    "Performed SQL analytics for business intelligence",
  ],
  bi: [
    "Created Power BI dashboards for executive stakeholder reporting",
    "Built business intelligence reports for data-driven decisions",
    "Implemented data visualization tools using Tableau",
    "Developed KPI tracking dashboards with real-time metrics",
  ],
  management: [
    "Led cross-functional teams in Agile project management",
    "Managed stakeholder communications for enterprise solutions",
    "Directed technical leadership for engineering teams of {n}",
    "Coordinated product roadmap and release planning",
  ],
  ml: [
    "Implemented machine learning models improving accuracy by {n}%",
    "Built predictive analytics pipelines with scikit-learn",
    "Deployed ML models to production serving 10K+ predictions daily",
    "Developed NLP pipelines for text classification",
  ],
  cloud: [
    "Architected cloud infrastructure on AWS with auto-scaling",
    "Deployed containerized applications using Docker and Kubernetes",
    "Managed CI/CD pipelines reducing deployment time by {n}0%",
    "Configured monitoring and alerting for cloud services",
  ],
  api: [
    "Designed REST APIs serving 10K+ requests per minute",
    "Built GraphQL APIs with optimized resolver performance",
    "Developed API gateway with rate limiting and authentication",
    "Implemented microservices architecture with message queues",
  ],
  data: [
    "Performed data engineering with Spark and Hadoop clusters",
    "Built real-time data pipelines using Apache Kafka",
    "Designed data lake architecture on AWS S3",
    "Implemented ETL workflows processing terabytes of data",
  ],
  frontend: [
    "Developed full stack applications using React and Node.js",
    "Built responsive web interfaces with TypeScript",
    "Implemented state management with Redux Toolkit",
    "Created component libraries for enterprise applications",
  ],
  qa: [
    "Established QA testing frameworks achieving 95% code coverage",
    "Implemented automated testing pipelines with Jest and Cypress",
    "Performed load testing and performance optimization",
    "Built CI/CD gates with automated quality checks",
  ],
};

const topicKeys = Object.keys(topicTemplates);
const sources = ["summary", "skill", "experience", "project"];

// Create deterministic topic centroids (one per topic)
const topicCentroids = topicKeys.map(() => randomVector(embeddingDimension));

// Generate a vector influenced by a specific topic
const topicInfluencedVector = (topicKey, strength = 0.6) => {
  const centroid = topicCentroids[topicKeys.indexOf(topicKey)];
  const noise = randomVector(embeddingDimension);
  return centroid.map((c, i) => c * strength + noise[i] * (1 - strength));
};

const fillTemplate = (template) => {
  return template.replace(/{n}/g, () => Math.floor(seededRandom() * 90) + 10);
};

export const generateBenchmarkDataset = () => {
  seedState = seed;
  const vectors = [];

  for (let i = 0; i < vectorCount; i++) {
    const topicKey = topicKeys[Math.floor(seededRandom() * topicKeys.length)];
    const templates = topicTemplates[topicKey];
    const text = fillTemplate(templates[Math.floor(seededRandom() * templates.length)]);

    vectors.push({
      bulletId: `bullet_${i}`,
      userId: `user_${(i % 10) + 1}`,
      resumeId: `resume_${(i % 20) + 1}`,
      text,
      source: sources[Math.floor(seededRandom() * sources.length)],
      embedding: topicInfluencedVector(topicKey),
      embeddingModel: "gemini-embedding-2",
      embeddingDimension,
      topic: topicKey,
    });
  }

  return vectors;
};

// Generate query embeddings that are close to specific topic centroids
export const generateBenchmarkQueries = () => {
  seedState = seed + 9999; // different seed for queries
  return queries.map((text, i) => {
    const topicKey = topicKeys[i % topicKeys.length];
    const embedding = topicInfluencedVector(topicKey, 0.8);
    return {
      text,
      embedding,
      topic: topicKey,
    };
  });
};

// Export vectors for identical ingestion into both databases
export const exportVectorsForDatabase = (dataset) => {
  return dataset.map((doc) => ({
    id: doc.bulletId,
    vector: doc.embedding,
    payload: {
      bulletId: doc.bulletId,
      userId: doc.userId.toString(),
      resumeId: doc.resumeId.toString(),
      text: doc.text,
      source: doc.source,
      embeddingModel: doc.embeddingModel,
      embeddingDimension: doc.embeddingDimension,
      topic: doc.topic,
    },
  }));
};

// Compute vector checksum for reproducibility verification
export const computeVectorChecksum = (dataset) => {
  let hash = 0;
  for (const doc of dataset) {
    for (let i = 0; i < doc.embedding.length; i++) {
      const bits = new Float32Array([doc.embedding[i]]).buffer;
      const view = new Uint8Array(bits);
      for (let j = 0; j < 4; j++) {
        hash = ((hash << 5) - hash + view[j]) | 0;
      }
    }
  }
  return `sha1-like:${Math.abs(hash).toString(16)}`;
};
