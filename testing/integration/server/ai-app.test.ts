import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeAll, describe, expect, it, vi } from "vitest";

const { mockResumeFindOne, mockJobDescriptionFindOne } = vi.hoisted(() => ({
  mockResumeFindOne: vi.fn(),
  mockJobDescriptionFindOne: vi.fn(),
}));

vi.mock("@server/configs/ai.js", () => ({
  default: { chat: { completions: { create: vi.fn() } }, embeddings: { create: vi.fn() } },
}));
vi.mock("@server/configs/redis.js", () => ({ getRedis: () => null, warnRedisUnavailable: vi.fn() }));
vi.mock("@server/configs/imageKit.js", () => ({ default: { files: { upload: vi.fn() } } }));
vi.mock("@server/models/User.js", () => ({ default: {} }));
vi.mock("@server/models/Resume.js", () => ({ default: { findOne: mockResumeFindOne } }));
vi.mock("@server/models/JobDescription.js", () => ({ default: { findOne: mockJobDescriptionFindOne } }));
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
vi.mock("@server/services/resumeParserService.js", () => ({ parseResumeTextAndCreate: vi.fn() }));
vi.mock("@server/services/optimizerService.js", () => ({
  generateOptimizationRecommendations: vi.fn(),
  AiRateLimitError: class AiRateLimitError extends Error {},
  AiProviderUnavailableError: class AiProviderUnavailableError extends Error {},
  AiTimeoutError: class AiTimeoutError extends Error {},
  AiMalformedResponseError: class AiMalformedResponseError extends Error {},
}));

import app from "@server/app.js";

const secret = "test-only-jwt-secret";
const token = () => jwt.sign({ userId: "507f1f77bcf86cd799439011" }, secret, { expiresIn: "1h" });

describe("Express app auth and AI input validation", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = secret;
    delete process.env.REDIS_URL;
  });

  it.each([
    ["Bearer token", () => `Bearer ${token()}`],
    ["raw token", token],
  ])("accepts a valid %s", async (_label, authorization) => {
    const response = await request(app)
      .post("/api/ai/enhance-pro-sum")
      .set("Authorization", authorization())
      .send({});

    expect(response.status).toBe(400);
  });

  it.each([undefined, "not-a-valid-token"])("rejects missing or invalid credentials", async (authorization) => {
    const testRequest = request(app).post("/api/ai/enhance-pro-sum").send({});
    if (authorization) testRequest.set("Authorization", authorization);
    const response = await testRequest;
    expect(response.status).toBe(401);
  });

  it("returns 400 for missing AI input", async () => {
    const response = await request(app)
      .post("/api/ai/enhance-job-desc")
      .set("Authorization", `Bearer ${token()}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it("returns 400 for missing optimizer input", async () => {
    const response = await request(app)
      .post("/api/analytics/optimize")
      .set("Authorization", `Bearer ${token()}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it("limits optimizer job-description lookups to the authenticated user", async () => {
    const userId = "ownership-user";
    mockResumeFindOne.mockResolvedValue({ skills: [], experience: [], project: [], education: [] });
    mockJobDescriptionFindOne.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/analytics/optimize")
      .set("Authorization", `Bearer ${jwt.sign({ userId }, secret)}`)
      .send({ resumeId: "resume-id", jobId: "job-id" });

    expect(response.status).toBe(404);
    expect(mockResumeFindOne).toHaveBeenCalledWith({ _id: "resume-id", userId });
    expect(mockJobDescriptionFindOne).toHaveBeenCalledWith({ _id: "job-id", userId });
    mockResumeFindOne.mockReset();
    mockJobDescriptionFindOne.mockReset();
  });

  it("returns 400 when an upload endpoint receives no file", async () => {
    const response = await request(app)
      .post("/api/optimizer/upload-resume-document")
      .set("Authorization", `Bearer ${token()}`)
      .field("title", "Test Resume");

    expect(response.status).toBe(400);
  });
});
