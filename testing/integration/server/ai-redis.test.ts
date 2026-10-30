import { createRequire } from "node:module";
import { createRequire } from "node:module";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import app from "@server/app.js";

const { mockGetRedis, mockWarnRedis, mockCompletion } = vi.hoisted(() => ({
  mockGetRedis: vi.fn(),
  mockWarnRedis: vi.fn(),
  mockCompletion: vi.fn(),
}));

vi.mock("@server/configs/redis.js", () => ({
  getRedis: mockGetRedis,
  warnRedisUnavailable: mockWarnRedis,
}));
vi.mock("@server/configs/ai.js", () => ({
  default: { chat: { completions: { create: mockCompletion } }, embeddings: { create: vi.fn() } },
}));
vi.mock("@server/configs/imageKit.js", () => ({ default: { files: { upload: vi.fn() } } }));
vi.mock("@server/models/User.js", () => ({ default: {} }));
vi.mock("@server/models/Resume.js", () => ({ default: {} }));
vi.mock("@server/models/JobDescription.js", () => ({ default: {} }));
vi.mock("@server/models/ResumeVersion.js", () => ({ default: {} }));
vi.mock("@server/models/MatchRecord.js", () => ({ default: {} }));
vi.mock("@server/models/Bullet.js", () => ({ default: {} }));
vi.mock("@server/models/RAGEvalLog.js", () => ({ default: {} }));
vi.mock("@server/models/RefinementFeedback.js", () => ({ default: {} }));
vi.mock("@server/services/ragService.js", () => ({
  tailorResume: vi.fn(),
  indexResumeBullets: vi.fn(),
  analyzeSkillGaps: vi.fn(),
  refineBullet: vi.fn(),
}));
vi.mock("@server/services/embeddingService.js", () => ({
  getEmbedding: vi.fn(),
  cosineSimilarity: vi.fn(() => 0),
  chunkExperience: vi.fn(() => []),
}));
vi.mock("@server/services/vectorStore/index.js", () => ({
  VECTOR_STORE: "mongodb",
  initQdrant: vi.fn(),
  upsertToQdrant: vi.fn(),
  deleteFromQdrant: vi.fn(),
  searchQdrant: vi.fn(),
}));
vi.mock("@server/services/resumeParserService.js", () => ({
  parseResumeTextAndCreate: vi.fn().mockResolvedValue({ _id: "resume-test-id", title: "Test Resume" }),
}));
vi.mock("@server/utils/documentParser.js", async (importOriginal) => ({
  ...(await importOriginal()),
  extractTextFromFile: vi.fn().mockResolvedValue("Extracted resume text"),
}));
vi.mock("@server/services/optimizerService.js", () => ({
  generateOptimizationRecommendations: vi.fn(),
  AiRateLimitError: class AiRateLimitError extends Error {},
  AiProviderUnavailableError: class AiProviderUnavailableError extends Error {},
  AiTimeoutError: class AiTimeoutError extends Error {},
  AiMalformedResponseError: class AiMalformedResponseError extends Error {},
}));

const require = createRequire(new URL("../../../server/package.json", import.meta.url));
const request = require("supertest");
const jwt = require("jsonwebtoken");
const RedisMock = require("ioredis-mock");
const jwtSecret = "test-only-redis-jwt-secret";
let userSequence = 0;
const userToken = (userId = `user-${++userSequence}`) =>
  jwt.sign({ userId }, jwtSecret, { expiresIn: "1h" });

const enhance = (userId, content = "Experienced analyst") => request(app)
  .post("/api/ai/enhance-pro-sum")
  .set("Authorization", `Bearer ${userToken(userId)}`)
  .send({ userContent: content });

describe("AI Redis rate limiting and caching", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = jwtSecret;
  });

  beforeEach(() => {
    mockCompletion.mockResolvedValue({ choices: [{ message: { content: "Enhanced content" } }] });
  });

  afterEach(() => {
    delete process.env.AI_RATE_LIMIT_MAX;
    delete process.env.AI_RATE_LIMIT_WINDOW_SECONDS;
    delete process.env.AI_CACHE_TTL_SECONDS;
    delete process.env.REDIS_URL;
    mockGetRedis.mockReset();
    mockWarnRedis.mockClear();
    mockCompletion.mockReset();
    mockCompletion.mockResolvedValue({ choices: [{ message: { content: "Enhanced content" } }] });
  });

  it("returns 429 with Retry-After when the per-user limit is reached", async () => {
    const redis = new RedisMock();
    mockGetRedis.mockReturnValue(redis);
    process.env.REDIS_URL = "redis://mock";
    process.env.AI_RATE_LIMIT_MAX = "1";

    const first = await enhance("limited-user");
    const second = await enhance("limited-user", "Another summary");

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.headers["retry-after"]).toMatch(/^\d+$/);
    expect(second.headers["x-ratelimit-limit"]).toBe("1");
    expect(second.headers["x-ratelimit-remaining"]).toBe("0");
    await redis.quit();
  });

  it("allows requests after the fixed window expires", async () => {
    const redis = new RedisMock();
    mockGetRedis.mockReturnValue(redis);
    process.env.REDIS_URL = "redis://mock";
    process.env.AI_RATE_LIMIT_MAX = "1";
    process.env.AI_RATE_LIMIT_WINDOW_SECONDS = "1";

    expect((await enhance("window-user")).status).toBe(200);
    expect((await enhance("window-user")).status).toBe(429);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect((await enhance("window-user")).status).toBe(200);
    await redis.quit();
  });

  it("fails open and logs a warning when the rate-limit Redis call fails", async () => {
    const redis = new RedisMock();
    redis.incr = vi.fn().mockRejectedValue(new Error("Redis unavailable"));
    mockGetRedis.mockReturnValue(redis);
    process.env.REDIS_URL = "redis://mock";

    const response = await enhance("fail-open-user");

    expect(response.status).toBe(200);
    expect(response.headers["x-ratelimit-limit"]).toBe("20");
    expect(mockWarnRedis).toHaveBeenCalled();
    await redis.quit();
  });

  it("works with REDIS_URL unset and marks the response BYPASS", async () => {
    mockGetRedis.mockReturnValue(null);

    const response = await enhance("redis-disabled-user");

    expect(response.status).toBe(200);
    expect(response.headers["x-cache"]).toBe("BYPASS");
    expect(response.headers["x-ratelimit-remaining"]).toBe("20");
  });

  it("returns HIT for a second identical request and calls the LLM once", async () => {
    const redis = new RedisMock();
    mockGetRedis.mockReturnValue(redis);
    process.env.REDIS_URL = "redis://mock";

    const first = await enhance("cache-user", "  Experienced   analyst  ");
    const second = await enhance("cache-user", "Experienced analyst");

    expect(first.headers["x-cache"]).toBe("MISS");
    expect(second.headers["x-cache"]).toBe("HIT");
    expect(mockCompletion).toHaveBeenCalledTimes(1);
    await redis.quit();
  });

  it("does not share a cache entry between users", async () => {
    const redis = new RedisMock();
    mockGetRedis.mockReturnValue(redis);
    process.env.REDIS_URL = "redis://mock";

    const first = await enhance("first-user");
    const second = await enhance("second-user");

    expect(first.headers["x-cache"]).toBe("MISS");
    expect(second.headers["x-cache"]).toBe("MISS");
    expect(mockCompletion).toHaveBeenCalledTimes(2);
    await redis.quit();
  });

  it("bypasses a failing cache and still computes the response", async () => {
    const redis = new RedisMock();
    redis.get = vi.fn().mockRejectedValue(new Error("Redis unavailable"));
    mockGetRedis.mockReturnValue(redis);
    process.env.REDIS_URL = "redis://mock";

    const response = await enhance("cache-error-user");

    expect(response.status).toBe(200);
    expect(response.headers["x-cache"]).toBe("BYPASS");
    expect(mockCompletion).toHaveBeenCalledTimes(1);
    expect(mockWarnRedis).toHaveBeenCalled();
    await redis.quit();
  });

  it("does not cache resume upload and parsing responses", async () => {
    const redis = new RedisMock();
    mockGetRedis.mockReturnValue(redis);
    process.env.REDIS_URL = "redis://mock";

    const response = await request(app)
      .post("/api/ai/upload-resume")
      .set("Authorization", `Bearer ${userToken("upload-user")}`)
      .send({ resumeText: "Resume contents", title: "Resume" });

    expect(response.status).toBe(200);
    expect(response.headers["x-cache"]).toBeUndefined();
    expect(mockCompletion).not.toHaveBeenCalled();

    const parsedUpload = await request(app)
      .post("/api/optimizer/upload-resume-document")
      .set("Authorization", `Bearer ${userToken("document-upload-user")}`)
      .field("title", "Uploaded Resume")
      .attach("file", Buffer.from("fake docx payload"), {
        filename: "resume.docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    expect(parsedUpload.status).toBe(201);
    expect(parsedUpload.headers["x-cache"]).toBeUndefined();
    expect(mockCompletion).not.toHaveBeenCalled();
    await redis.quit();
  });
});
