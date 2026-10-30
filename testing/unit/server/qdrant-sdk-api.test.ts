import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(new URL("../../../server/package.json", import.meta.url));
const { QdrantClient } = require("@qdrant/js-client-rest");

const apiResponse = (result: unknown) => new Response(JSON.stringify({
  result,
  status: "ok",
  time: 0,
}), {
  status: 200,
  headers: { "content-type": "application/json" },
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("installed Qdrant SDK API compatibility", () => {
  it("uses the SDK query API, returns mapped points, and sends the user filter", async () => {
    expect(typeof QdrantClient.prototype.query).toBe("function");
    expect(QdrantClient.prototype.search).toBeUndefined();

    vi.resetModules();
    vi.stubEnv("VECTOR_STORE", "qdrant");
    vi.stubEnv("QDRANT_URL", "https://qdrant-test.invalid");
    vi.stubEnv("QDRANT_API_KEY", "qdrant-sdk-test-key");
    vi.stubEnv("QDRANT_COLLECTION", "resume_embeddings");
    vi.stubEnv("EMBEDDING_DIMENSIONS", "3072");

    let queryBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = new URL(input.toString());
      if (requestUrl.pathname === "/collections" && init?.method === "GET") {
        return apiResponse({ collections: [{ name: "resume_embeddings" }] });
      }
      if (requestUrl.pathname === "/collections/resume_embeddings" && init?.method === "GET") {
        return apiResponse({
          config: { params: { vectors: { size: 3072, distance: "Cosine" } } },
          payload_schema: {
            userId: { data_type: "keyword" },
            resumeId: { data_type: "keyword" },
            embeddingModel: { data_type: "keyword" },
            bulletId: { data_type: "keyword" },
          },
        });
      }
      if (requestUrl.pathname === "/collections/resume_embeddings/points/query" && init?.method === "POST") {
        queryBody = JSON.parse(String(init.body));
        return apiResponse({
          points: [{
            id: "point-1",
            score: 0.91,
            payload: {
              bulletId: "bullet-1",
              text: "Built reliable data pipelines",
              source: "experience",
              metadata: { company: "Example" },
            },
          }],
        });
      }
      throw new Error(`Unexpected mocked Qdrant request: ${init?.method} ${requestUrl.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});

    const { searchQdrant } = await import("../../../server/services/vectorStore/qdrantStore.js");
    const results = await searchQdrant([0.1, 0.2], 3, { userId: "user-1" });

    expect(results).toEqual([{
      bulletId: "bullet-1",
      text: "Built reliable data pipelines",
      source: "experience",
      metadata: { company: "Example" },
      score: 0.91,
    }]);
    expect(queryBody).toEqual(expect.objectContaining({
      query: [0.1, 0.2],
      limit: 6,
      with_payload: true,
      with_vector: false,
      filter: { must: [{ key: "userId", match: { value: "user-1" } }] },
    }));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
