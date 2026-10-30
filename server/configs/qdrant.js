import "dotenv/config";

const supportedModes = new Set(["mongodb", "qdrant", "shadow"]);
const requestedMode = (process.env.VECTOR_STORE || "mongodb").trim().toLowerCase();
const requestedCollection = (process.env.QDRANT_COLLECTION || "resume_embeddings").trim();
const missingVariables = ["QDRANT_URL", "QDRANT_API_KEY"].filter(
  (name) => !process.env[name]?.trim()
);

let mode = requestedMode;

if (!supportedModes.has(requestedMode)) {
  console.warn("[Vector store] Unsupported VECTOR_STORE; using mongodb.");
  mode = "mongodb";
} else if (requestedMode !== "mongodb" && missingVariables.length > 0) {
  console.warn(
    `[Vector store] Missing ${missingVariables.join(", ")}; using mongodb.`
  );
  mode = "mongodb";
}

export const qdrantConfig = Object.freeze({
  configured: missingVariables.length === 0,
  mode,
  collection: requestedCollection || "resume_embeddings",
});

export const QDRANT_URL = process.env.QDRANT_URL;
export const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
