/**
 * Vector Store Abstraction
 *
 * Provides Qdrant operations and the active vector store mode.
 * MongoDB retrieval logic remains in ragService.js to preserve
 * existing behavior and minimize changes.
 */

import {
  initQdrant,
  upsertToQdrant,
  deleteFromQdrant,
  searchQdrant,
  getQdrantHealth,
  getQdrantCollectionInfo,
} from "./qdrantStore.js";

const requestedStore = (process.env.VECTOR_STORE || "mongodb").toLowerCase();
const supportedStores = new Set(["mongodb", "qdrant", "shadow"]);

if (!supportedStores.has(requestedStore)) {
  console.warn(
    `[Vector store] Unsupported VECTOR_STORE=${requestedStore}; using mongodb instead.`
  );
}

export const VECTOR_STORE = supportedStores.has(requestedStore)
  ? requestedStore
  : "mongodb";

export {
  initQdrant,
  upsertToQdrant,
  deleteFromQdrant,
  searchQdrant,
  getQdrantHealth,
  getQdrantCollectionInfo,
};
