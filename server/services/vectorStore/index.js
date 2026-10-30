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
  searchQdrantReadOnly,
  getQdrantHealth,
  getQdrantCollectionInfo,
} from "./qdrantStore.js";
import { qdrantConfig } from "../../configs/qdrant.js";

export const VECTOR_STORE = qdrantConfig.mode;
export { qdrantConfig };

export {
  initQdrant,
  upsertToQdrant,
  deleteFromQdrant,
  searchQdrant,
  searchQdrantReadOnly,
  getQdrantHealth,
  getQdrantCollectionInfo,
};
