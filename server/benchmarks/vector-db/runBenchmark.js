/**
 * Vector DB Benchmark Runner
 *
 * Compares MongoDB vs Qdrant for Resume ↔ JD RAG workload.
 * This is an isolated benchmark that does NOT modify production data or code.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import { BENCHMARK_CONFIG } from "./benchmark.config.js";
import { generateBenchmarkDataset, generateBenchmarkQueries, exportVectorsForDatabase, computeVectorChecksum } from "./generateDataset.js";
import { runMongoDBBenchmark, cleanupMongoDBBenchmark, computeGroundTruth } from "./mongodb.benchmark.js";
import { runQdrantBenchmark, cleanupQdrantBenchmark } from "./qdrant.benchmark.js";
import { runScaleBenchmark } from "./scale.benchmark.js";
import { generateReport } from "./report.js";

dotenv.config();

const outputDir = path.resolve(BENCHMARK_CONFIG.outputDir);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const connectMongo = async () => {
  const uri = process.env.MONGODB_URI?.replace(/^["']|["'];?$/g, "").trim() || "mongodb://127.0.0.1:27017/resume-builder";
  await mongoose.connect(uri, { dbName: "resume-builder" });
  console.log("Connected to MongoDB for benchmark");
};

const disconnectMongo = async () => {
  await mongoose.disconnect();
};

const run = async () => {
  const startTime = Date.now();
  console.log("Starting Vector DB Benchmark...\n");

  try {
    await connectMongo();

    // Generate IDENTICAL dataset for both systems
    const dataset = generateBenchmarkDataset();
    const uniqueUsers = [...new Set(dataset.map(d => d.userId))];
    const uniqueResumes = [...new Set(dataset.map(d => d.resumeId))];
    const queries = generateBenchmarkQueries().map((q, i) => ({
      ...q,
      userId: uniqueUsers[i % uniqueUsers.length],
      resumeId: uniqueResumes[i % uniqueResumes.length],
    }));

    const checksum = computeVectorChecksum(dataset);
    console.log(`Dataset: ${BENCHMARK_CONFIG.vectorCount} vectors, ${queries.length} queries`);
    console.log(`Checksum: ${checksum}\n`);

    // Compute ground truth ONCE using exact cosine search with same filters as actual search
    console.log("Computing ground truth (exact cosine similarity)...");
    const groundTruth = computeGroundTruth(queries, dataset, (q) => ({
      userId: q.userId,
      embeddingModel: "gemini-embedding-2",
    }));
    console.log(`Ground truth computed for ${groundTruth.length} queries\n`);

    // MongoDB Benchmark
    console.log("Running MongoDB Benchmark...");
    const mongodbResults = await runMongoDBBenchmark(dataset, queries, groundTruth);
    console.log("MongoDB Benchmark Complete\n");

    await cleanupMongoDBBenchmark();
    await disconnectMongo();

    // Qdrant Benchmark
    console.log("Running Qdrant Benchmark...");
    const qdrantResults = await runQdrantBenchmark(dataset, queries, groundTruth);
    console.log("Qdrant Benchmark Complete\n");

    await cleanupQdrantBenchmark();

    // Scale Benchmark (synthetic only)
    console.log("Running Scale Benchmark...");
    const scaleResults = await runScaleBenchmark(queries);
    console.log("Scale Benchmark Complete\n");

    // Generate report
    const report = generateReport({
      mongodb: mongodbResults,
      qdrant: qdrantResults,
      scale: scaleResults,
      config: BENCHMARK_CONFIG,
      duration: Date.now() - startTime,
    });

    // Save results
    const jsonPath = path.join(outputDir, BENCHMARK_CONFIG.jsonFile);
    const mdPath = path.join(outputDir, BENCHMARK_CONFIG.markdownFile);
    const csvPath = path.join(outputDir, BENCHMARK_CONFIG.csvFile);

    fs.writeFileSync(jsonPath, JSON.stringify(report.json, null, 2));
    fs.writeFileSync(mdPath, report.markdown);
    fs.writeFileSync(csvPath, report.csv);

    console.log("\nBenchmark Complete!");
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  Markdown: ${mdPath}`);
    console.log(`  CSV: ${csvPath}`);
    console.log(`  Duration: ${report.duration}ms`);

  } catch (err) {
    console.error("Benchmark failed:", err);
    process.exit(1);
  }
};

run();
