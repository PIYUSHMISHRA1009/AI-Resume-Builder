import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockQdrant, mockState, mockBullet, mockFeedback } = vi.hoisted(() => ({
  mockState: {
    collectionExists: true,
    vectorSize: 3072,
    distance: "Cosine",
    payloadIndexes: new Set<string>(["userId", "resumeId", "embeddingModel", "bulletId"]),
  },
  mockQdrant: {
    getCollections: vi.fn(),
    createCollection: vi.fn(),
    getCollection: vi.fn(),
    createPayloadIndex: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
  },
  mockBullet: {
    aggregate: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  mockFeedback: { find: vi.fn() },
}));

vi.mock("../../../server/node_modules/@qdrant/js-client-rest/dist/esm/index.js", () => ({
  QdrantClient: vi.fn(() => mockQdrant),
}));
vi.mock("../../../server/models/Bullet.js", () => ({ default: mockBullet }));
vi.mock("../../../server/models/RefinementFeedback.js", () => ({ default: mockFeedback }));
vi.mock("../../../server/models/Resume.js", () => ({ default: {} }));
vi.mock("../../../server/models/RAGEvalLog.js", () => ({ default: {} }));
vi.mock("../../../server/configs/ai.js", () => ({ default: {} }));

const fakeKey = "qdrant-test-key-do-not-log";
const userId = "507f1f77bcf86cd799439011";

const configureQdrant = (mode = "qdrant") => {
  vi.stubEnv("VECTOR_STORE", mode);
  vi.stubEnv("QDRANT_URL", "https://qdrant-test.invalid");
  vi.stubEnv("QDRANT_API_KEY", fakeKey);
  vi.stubEnv("QDRANT_COLLECTION", "resume_embeddings");
  vi.stubEnv("EMBEDDING_DIMENSIONS", "3072");
  vi.stubEnv("EMBEDDING_MODEL", "gemini-embedding-2");
};

const resetQdrant = () => {
  mockState.collectionExists = true;
  mockState.vectorSize = 3072;
  mockState.distance = "Cosine";
  mockState.payloadIndexes = new Set(["userId", "resumeId", "embeddingModel", "bulletId"]);
  mockQdrant.getCollections.mockReset().mockImplementation(async () => ({
    collections: mockState.collectionExists ? [{ name: "resume_embeddings" }] : [],
  }));
  mockQdrant.createCollection.mockReset().mockImplementation(async () => {
    mockState.collectionExists = true;
  });
  mockQdrant.getCollection.mockReset().mockImplementation(async () => ({
    config: { params: { vectors: { size: mockState.vectorSize, distance: mockState.distance } } },
    payload_schema: Object.fromEntries([...mockState.payloadIndexes].map((key) => [key, { data_type: "keyword" }])),
    points_count: 3,
  }));
  mockQdrant.createPayloadIndex.mockReset().mockImplementation(async (_collection, { field_name }) => {
    mockState.payloadIndexes.add(field_name);
  });
  mockQdrant.upsert.mockReset().mockResolvedValue({});
  mockQdrant.delete.mockReset().mockResolvedValue({});
  mockQdrant.search.mockReset().mockResolvedValue([]);
};

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  configureQdrant();
  resetQdrant();
  mockBullet.aggregate.mockReset();
  mockBullet.find.mockReset();
  mockFeedback.find.mockReset().mockReturnValue({ lean: async () => [] });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Qdrant config and store safety", () => {
  it("falls back to mongodb with one warning naming missing variables only", async () => {
    vi.stubEnv("QDRANT_URL", "");
    vi.stubEnv("QDRANT_API_KEY", "");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    const store = await import("../../../server/services/vectorStore/index.js");

    expect(store.VECTOR_STORE).toBe("mongodb");
    expect(store.qdrantConfig).toEqual({
      configured: false,
      mode: "mongodb",
      collection: "resume_embeddings",
    });
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning.mock.calls.flat().join(" ")).toContain("QDRANT_URL, QDRANT_API_KEY");
    expect(warning.mock.calls.flat().join(" ")).not.toContain(fakeKey);
  });

  it("uses mongodb for an unknown vector store mode", async () => {
    vi.stubEnv("VECTOR_STORE", "unsupported-mode");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    const store = await import("../../../server/services/vectorStore/index.js");

    expect(store.VECTOR_STORE).toBe("mongodb");
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it("includes userId in every search and delete filter", async () => {
    const store = await import("../../../server/services/vectorStore/index.js");
    await store.initQdrant();
    await store.searchQdrant([0.2, 0.3], 5, {
      userId,
      resumeId: "507f1f77bcf86cd799439012",
    });
    await store.deleteFromQdrant(userId, ["bullet-a", "bullet-b"]);

    expect(mockQdrant.search).toHaveBeenCalledWith("resume_embeddings", expect.objectContaining({
      filter: { must: expect.arrayContaining([{ key: "userId", match: { value: userId } }]) },
    }));
    expect(mockQdrant.delete).toHaveBeenCalledWith("resume_embeddings", {
      filter: {
        must: [
          { key: "userId", match: { value: userId } },
          { key: "bulletId", match: { any: ["bullet-a", "bullet-b"] } },
        ],
      },
    });
  });

  it("refuses an existing collection with a mismatched vector size", async () => {
    mockState.vectorSize = 1536;
    const store = await import("../../../server/services/vectorStore/index.js");

    await expect(store.initQdrant()).rejects.toThrow(/vector size mismatch.*3072.*1536/);
    expect(mockQdrant.createCollection).not.toHaveBeenCalled();
    expect(mockQdrant.createPayloadIndex).not.toHaveBeenCalled();
  });

  it("creates the collection and missing indexes only once", async () => {
    mockState.collectionExists = false;
    mockState.payloadIndexes = new Set();
    const store = await import("../../../server/services/vectorStore/index.js");

    await store.initQdrant();
    await store.initQdrant();

    expect(mockQdrant.createCollection).toHaveBeenCalledTimes(1);
    expect(mockQdrant.createPayloadIndex).toHaveBeenCalledTimes(4);
  });
});

describe("Qdrant retrieval fallbacks", () => {
  const mongoBullet = {
    _id: "507f1f77bcf86cd799439099",
    text: "MongoDB fallback bullet",
    source: "experience",
    metadata: {},
    embedding: [0.2, 0.3],
  };

  const prepareMongoFallback = () => {
    mockBullet.aggregate.mockRejectedValue(new Error("Atlas vector search unavailable"));
    mockBullet.find.mockReturnValue({ exec: async () => [mongoBullet] });
    mockFeedback.find.mockReturnValue({ lean: async () => [] });
    mockQdrant.search.mockRejectedValue(new Error(`request failed ${fakeKey}`));
  };

  it.each(["qdrant", "shadow"])('returns MongoDB results when Qdrant fails in %s mode', async (mode) => {
    configureQdrant(mode);
    prepareMongoFallback();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { retrieveBullets } = await import("../../../server/services/ragService.js");

    const result = await retrieveBullets(userId, [0.2, 0.3], 5);
    const bullets = mode === "shadow" ? result.bullets : result;
    expect(bullets).toEqual([expect.objectContaining({ text: mongoBullet.text })]);
    expect(warning).toHaveBeenCalledWith("[Qdrant] Search failed; using MongoDB retrieval.");
    expect(`${warning.mock.calls.flat().join(" ")} ${log.mock.calls.flat().join(" ")}`).not.toContain(fakeKey);
  });
});
