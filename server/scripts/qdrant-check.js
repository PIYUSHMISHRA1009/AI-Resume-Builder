import "dotenv/config";
import mongoose from "mongoose";
import { QdrantClient } from "@qdrant/js-client-rest";
import Bullet from "../models/Bullet.js";

const qdrantUrlConfigured = Boolean(process.env.QDRANT_URL?.trim());
const qdrantApiKeyConfigured = Boolean(process.env.QDRANT_API_KEY?.trim());
const collectionConfigured = Boolean(process.env.QDRANT_COLLECTION?.trim());
const collection = process.env.QDRANT_COLLECTION?.trim() || "resume_embeddings";
const requestedMode = (process.env.VECTOR_STORE || "mongodb").trim().toLowerCase();
const mode = new Set(["mongodb", "qdrant", "shadow"]).has(requestedMode)
  ? requestedMode
  : "unknown";
const expectedVectorSize = Number.parseInt(process.env.EMBEDDING_DIMENSIONS || "3072", 10);

const print = (name, value) => console.log(`${name}: ${value}`);
const getStatusCode = (error) =>
  error?.status ?? error?.statusCode ?? error?.response?.status ?? "unknown";

const main = async () => {
  print("QDRANT_URL configured", qdrantUrlConfigured ? "yes" : "no");
  print("QDRANT_API_KEY configured", qdrantApiKeyConfigured ? "yes" : "no");
  print("QDRANT_COLLECTION configured", collectionConfigured ? "yes" : "no");
  print("VECTOR_STORE mode", mode);

  let qdrantHealthy = false;
  let pointsCount = null;
  if (!qdrantUrlConfigured || !qdrantApiKeyConfigured) {
    print("Qdrant reachable", "no");
    print("Qdrant auth", "failed");
    print("Collection exists", "no");
    print("Vector size", "unavailable");
    print("Distance", "unavailable");
    print("Points count", "unavailable");
    print("userId index present", "no");
  } else {
    const client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      checkCompatibility: false,
    });

    try {
      await client.getCollections();
      qdrantHealthy = true;
      print("Qdrant reachable", "yes");
      print("Qdrant auth", "OK");

      const info = await client.getCollection(collection);
      const vectors = info.config?.params?.vectors;
      const vectorSize = vectors?.size ?? "unavailable";
      const distance = vectors?.distance ?? "unavailable";
      pointsCount = info.points_count ?? 0;
      print("Collection exists", "yes");
      print("Vector size", vectorSize);
      print("Distance", distance);
      print("Points count", pointsCount);
      print("userId index present", info.payload_schema?.userId ? "yes" : "no");
      qdrantHealthy =
        Number.isInteger(expectedVectorSize) &&
        vectorSize === expectedVectorSize &&
        distance === "Cosine" &&
        Boolean(info.payload_schema?.userId);
    } catch (error) {
      const statusCode = getStatusCode(error);
      if (!qdrantHealthy) {
        print("Qdrant reachable", statusCode === "unknown" ? "no" : "yes");
        print("Qdrant auth", "failed");
      } else {
        print("Collection exists", "no");
        print("Vector size", "unavailable");
        print("Distance", "unavailable");
        print("Points count", "unavailable");
        print("userId index present", "no");
      }
      print("Qdrant status code", statusCode);
      qdrantHealthy = false;
    }
  }

  let mongoCount = null;
  try {
    const mongodbUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/resume-builder";
    await mongoose.connect(mongodbUri, {
      dbName: "resume-builder",
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
    });
    mongoCount = await Bullet.countDocuments({
      embedding: { $exists: true, $ne: [] },
    });
    print("MongoDB reachable", "yes");
    print("Mongo bullet count", mongoCount);
  } catch {
    print("MongoDB reachable", "no");
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
  }

  if (mongoCount !== null && pointsCount !== null) {
    print("Mongo vs Qdrant bullet count", `${mongoCount} vs ${pointsCount}`);
  }
  if (!qdrantHealthy) process.exitCode = 1;
};

main().catch(() => {
  print("Qdrant check", "failed");
  process.exitCode = 1;
});
