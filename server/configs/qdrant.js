import "dotenv/config";

const supportedModes = new Set(["mongodb", "qdrant", "shadow"]);
const requestedMode = (process.env.VECTOR_STORE || "mongodb").trim().toLowerCase();
const requestedCollection = (process.env.QDRANT_COLLECTION || "resume_embeddings").trim();
const qdrantUrl = process.env.QDRANT_URL?.trim();
const missingVariables = ["QDRANT_URL", "QDRANT_API_KEY"].filter(
  (name) => !process.env[name]?.trim()
);
const invalidVariables = [];

if (qdrantUrl) {
  try {
    const parsedUrl = new URL(qdrantUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
      invalidVariables.push("QDRANT_URL");
    }
  } catch {
    invalidVariables.push("QDRANT_URL");
  }
}

let mode = requestedMode;

if (!supportedModes.has(requestedMode)) {
  console.warn("[Vector store] Unsupported VECTOR_STORE; using mongodb.");
  mode = "mongodb";
} else if (requestedMode !== "mongodb" && (missingVariables.length > 0 || invalidVariables.length > 0)) {
  const problemVariables = [...new Set([...missingVariables, ...invalidVariables])];
  console.warn(
    `[Vector store] Invalid or missing ${problemVariables.join(", ")}; using mongodb.`
  );
  mode = "mongodb";
}

export const qdrantConfig = Object.freeze({
  configured: missingVariables.length === 0 && invalidVariables.length === 0,
  mode,
  collection: requestedCollection || "resume_embeddings",
});

export const QDRANT_URL = process.env.QDRANT_URL;
export const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
