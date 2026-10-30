/**
 * Qdrant Vector Store
 *
 * Primary vector database for RAG retrieval.
 * MongoDB remains the source of truth for application data.
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import { QDRANT_API_KEY, QDRANT_URL, qdrantConfig } from "../../configs/qdrant.js";

const COLLECTION_NAME = qdrantConfig.collection;
const VECTOR_SIZE = 3072;
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

  // Ensure payload indexes exist for filtered search
  try {
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: "userId",
      field_schema: "keyword",
    });
  } catch (e) {
    // Index may already exist
  }

  try {
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: "resumeId",
      field_schema: "keyword",
    });
  } catch (e) {
    // Index may already exist
  }

  try {
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: "embeddingModel",
      field_schema: "keyword",
    });
  } catch (e) {
    // Index may already exist
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
export const deleteVectorsByBulletIds = async (bulletIds) => {
  if (!isInitialized) {
    await initializeCollection();
  }

  const qdrant = getClient();

  if (bulletIds.length === 0) return;

  // Qdrant delete by filter
  await qdrant.delete(COLLECTION_NAME, {
    filter: {
      must: [
        {
          key: "bulletId",
          match: {
            value: bulletIds,
          },
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
export const searchVectors = async (queryVector, topK = 5, filter = {}) => {
  if (!isInitialized) {
    await initializeCollection();
  }

  const qdrant = getClient();

  const mustConditions = [];

  if (filter.userId) {
    mustConditions.push({
      key: "userId",
      match: { value: filter.userId },
    });
  }

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

  const searchParams = {
    vector: queryVector,
    limit: topK * 2, // Get extra to allow for boosting to change order
    with_payload: true,
    with_vector: false,
  };

  if (mustConditions.length > 0) {
    searchParams.filter = { must: mustConditions };
  }

  const result = await qdrant.search(COLLECTION_NAME, searchParams);

  return result.map((r) => ({
    bulletId: r.payload.bulletId,
    text: r.payload.text,
    source: r.payload.source,
    metadata: r.payload.metadata || {},
    score: r.score || 0,
  }));
};

/**
 * Health check for Qdrant connectivity.
 */
export const healthCheck = async () => {
  try {
    const qdrant = getClient();
    await qdrant.getCollections();
    return { status: "ok", collection: COLLECTION_NAME };
  } catch (error) {
    return { status: "error", message: error.message };
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
export const getQdrantHealth = healthCheck;
export const getQdrantCollectionInfo = getCollectionInfo;
