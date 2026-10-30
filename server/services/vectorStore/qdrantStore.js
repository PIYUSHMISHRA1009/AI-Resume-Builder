/**
 * Qdrant Vector Store
 *
 * Primary vector database for RAG retrieval.
 * MongoDB remains the source of truth for application data.
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import { QDRANT_API_KEY, QDRANT_URL, qdrantConfig } from "../../configs/qdrant.js";

const COLLECTION_NAME = qdrantConfig.collection;
const VECTOR_SIZE = Number.parseInt(process.env.EMBEDDING_DIMENSIONS || "3072", 10);
const DISTANCE = "Cosine";

let client = null;
let isInitialized = false;

const getClient = () => {
  if (!client) {
    if (!QDRANT_URL) {
      throw new Error("QDRANT_URL is not configured");
    }
    client = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
      // Qdrant Cloud may block its version metadata endpoint while allowing the
      // data API. Compatibility is pinned by this application's client version.
      checkCompatibility: false,
    });
  }
  return client;
};

/**
 * Convert a string ID to a deterministic unsigned integer for Qdrant.
 */
const stringToUnsignedInt = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) >>> 0;
};

/**
 * Ensure the Qdrant collection exists with correct configuration.
 */
export const initializeCollection = async () => {
  if (isInitialized) return;
  if (!Number.isInteger(VECTOR_SIZE) || VECTOR_SIZE < 1) {
    throw new Error("EMBEDDING_DIMENSIONS must be a positive integer");
  }

  const qdrant = getClient();
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(
    (c) => c.name === COLLECTION_NAME
  );

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: DISTANCE,
      },
    });
    console.log(`[Qdrant] Created collection: ${COLLECTION_NAME}`);
  }

  const collectionInfo = await qdrant.getCollection(COLLECTION_NAME);
  const vectors = collectionInfo.config?.params?.vectors;
  const existingSize = vectors?.size;
  const existingDistance = vectors?.distance;

  if (existingSize !== VECTOR_SIZE) {
    const message = `Qdrant collection vector size mismatch (configured ${VECTOR_SIZE}, existing ${existingSize ?? "unknown"})`;
    console.error(`[Qdrant] ${message}`);
    throw new Error(message);
  }
  if (existingDistance !== DISTANCE) {
    const message = `Qdrant collection distance mismatch (configured ${DISTANCE}, existing ${existingDistance ?? "unknown"})`;
    console.error(`[Qdrant] ${message}`);
    throw new Error(message);
  }

  const payloadSchema = collectionInfo.payload_schema || {};
  for (const fieldName of ["userId", "resumeId", "embeddingModel", "bulletId"]) {
    if (!payloadSchema[fieldName]) {
      await qdrant.createPayloadIndex(COLLECTION_NAME, {
        field_name: fieldName,
        field_schema: "keyword",
      });
    }
  }

  isInitialized = true;
  console.log(`[Qdrant] Collection ready: ${COLLECTION_NAME}`);
};

/**
 * Upsert vectors into Qdrant.
 * Each point represents one MongoDB Bullet.
 *
 * @param {Array} points - Array of { bulletId, vector, payload }
 */
export const upsertVectors = async (points) => {
  if (!isInitialized) {
    await initializeCollection();
  }

  const qdrant = getClient();
  if (points.some((point) => !point.payload?.userId)) {
    throw new Error("Qdrant points require a userId payload");
  }
  const qdrantPoints = points.map((p) => ({
    id: stringToUnsignedInt(p.bulletId),
    vector: p.vector,
    payload: {
      bulletId: p.bulletId,
      ...p.payload,
    },
  }));

  await qdrant.upsert(COLLECTION_NAME, {
    points: qdrantPoints,
  });

  return qdrantPoints.length;
};

/**
 * Delete vectors by bullet IDs.
 *
 * @param {Array<string>} bulletIds - MongoDB Bullet _id strings
 */
export const deleteVectorsByBulletIds = async (userId, bulletIds) => {
  if (!isInitialized) {
    await initializeCollection();
  }

  const qdrant = getClient();

  if (!userId) throw new Error("Qdrant deletes require a userId filter");
  if (bulletIds.length === 0) return;

  // Qdrant delete by filter
  await qdrant.delete(COLLECTION_NAME, {
    filter: {
      must: [
        {
          key: "userId",
          match: { value: userId },
        },
        {
          key: "bulletId",
          match: { any: bulletIds },
        },
      ],
    },
  });
};

/**
 * Search vectors in Qdrant.
 *
 * @param {Array<number>} queryVector - Query embedding
 * @param {number} topK - Number of results to return
 * @param {Object} filter - Optional payload filters { userId, resumeId, embeddingModel }
 * @returns {Array} Search results with bulletId, text, source, metadata, score
 */
const queryVectors = async (queryVector, topK = 5, filter = {}) => {
  if (!filter.userId) throw new Error("Qdrant searches require a userId filter");

  const qdrant = getClient();

  const mustConditions = [];

  mustConditions.push({
    key: "userId",
    match: { value: filter.userId },
  });

  if (filter.resumeId) {
    mustConditions.push({
      key: "resumeId",
      match: { value: filter.resumeId },
    });
  }

  if (filter.embeddingModel) {
    mustConditions.push({
      key: "embeddingModel",
      match: { value: filter.embeddingModel },
    });
  }

  const queryParams = {
    query: queryVector,
    limit: topK * 2, // Get extra to allow for boosting to change order
    with_payload: true,
    with_vector: false,
  };

  if (mustConditions.length > 0) {
    queryParams.filter = { must: mustConditions };
  }

  const result = await qdrant.query(COLLECTION_NAME, queryParams);

  return (result.points || []).map((r) => ({
    bulletId: r.payload.bulletId,
    text: r.payload.text,
    source: r.payload.source,
    metadata: r.payload.metadata || {},
    score: r.score || 0,
  }));
};

export const searchVectors = async (queryVector, topK = 5, filter = {}) => {
  if (!isInitialized) {
    await initializeCollection();
  }
  return queryVectors(queryVector, topK, filter);
};

// Read-only query entry point for validators; it never creates collections or indexes.
export const searchVectorsReadOnly = queryVectors;

/**
 * Health check for Qdrant connectivity.
 */
export const healthCheck = async () => {
  try {
    const qdrant = getClient();
    await qdrant.getCollections();
    return { status: "ok", collection: COLLECTION_NAME };
  } catch {
    return { status: "error" };
  }
};

/**
 * Get collection info.
 */
export const getCollectionInfo = async () => {
  try {
    const qdrant = getClient();
    const info = await qdrant.getCollection(COLLECTION_NAME);
    return info;
  } catch (error) {
    return null;
  }
};

export { stringToUnsignedInt };

// Convenience wrapper for single-point upserts
export const upsertToQdrant = async (bulletId, vector, payload = {}) => {
  return upsertVectors([{ bulletId, vector, payload }]);
};

// Aliases for consistency
export const initQdrant = initializeCollection;
export const deleteFromQdrant = deleteVectorsByBulletIds;
export const searchQdrant = searchVectors;
export const searchQdrantReadOnly = searchVectorsReadOnly;
export const getQdrantHealth = healthCheck;
export const getQdrantCollectionInfo = getCollectionInfo;
