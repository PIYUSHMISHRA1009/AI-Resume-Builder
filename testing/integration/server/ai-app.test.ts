import { createRequire } from "node:module";
import { beforeAll, describe, expect, it, vi } from "vitest";

const { mockResumeFindOne, mockResumeFindOneAndUpdate, mockResumeFindOneAndDelete, mockJobDescriptionFindOne } = vi.hoisted(() => ({
  mockResumeFindOne: vi.fn(),
  mockResumeFindOneAndUpdate: vi.fn(),
  mockResumeFindOneAndDelete: vi.fn(),
  mockJobDescriptionFindOne: vi.fn(),
}));

vi.mock("@server/configs/ai.js", () => ({
  default: { chat: { completions: { create: vi.fn() } }, embeddings: { create: vi.fn() } },
}));
vi.mock("@server/configs/redis.js", () => ({ getRedis: () => null, warnRedisUnavailable: vi.fn() }));
vi.mock("@server/configs/imageKit.js", () => ({ default: { files: { upload: vi.fn() } } }));
vi.mock("@server/models/User.js", () => ({ default: {} }));
vi.mock("@server/models/Resume.js", () => ({
  default: { findOne: mockResumeFindOne, findOneAndUpdate: mockResumeFindOneAndUpdate, findOneAndDelete: mockResumeFindOneAndDelete },
}));
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
vi.mock("@server/services/resumeParserService.js", () => ({ parseResumeTextAndCreate: vi.fn() }));
vi.mock("@server/services/optimizerService.js", () => ({
  generateOptimizationRecommendations: vi.fn(),
  AiRateLimitError: class AiRateLimitError extends Error {},
  AiProviderUnavailableError: class AiProviderUnavailableError extends Error {},
  AiTimeoutError: class AiTimeoutError extends Error {},
  AiMalformedResponseError: class AiMalformedResponseError extends Error {},
}));

import app from "@server/app.js";

const require = createRequire(new URL("../../../server/package.json", import.meta.url));
const request = require("supertest");
const jwt = require("jsonwebtoken");
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

  it("returns 400 for a request with no JSON body", async () => {
    const response = await request(app)
      .post("/api/ai/enhance-pro-sum")
      .set("Authorization", `Bearer ${token()}`);

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

  it("limits match-analysis job-description lookups to the authenticated user", async () => {
    const userId = "match-ownership-user";
    mockResumeFindOne.mockResolvedValue({});
    mockJobDescriptionFindOne.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/analytics/match")
      .set("Authorization", `Bearer ${jwt.sign({ userId }, secret)}`)
      .send({ resumeId: "resume-id", jobId: "job-id" });

    expect(response.status).toBe(404);
    expect(mockResumeFindOne).toHaveBeenCalledWith({ _id: "resume-id", userId });
    expect(mockJobDescriptionFindOne).toHaveBeenCalledWith({ _id: "job-id", userId });
    mockResumeFindOne.mockReset();
    mockJobDescriptionFindOne.mockReset();
  });

  it("does not allow resume updates to transfer ownership", async () => {
    const userId = "resume-owner";
    mockResumeFindOneAndUpdate.mockResolvedValue({ _id: "resume-id", userId, title: "Updated" });

    const response = await request(app)
      .put("/api/resumes/update")
      .set("Authorization", `Bearer ${jwt.sign({ userId }, secret)}`)
      .send({ resumeId: "resume-id", resumeData: { title: "Updated", userId: "another-user" } });

    expect(response.status).toBe(200);
    expect(mockResumeFindOneAndUpdate).toHaveBeenCalledWith(
      { userId, _id: "resume-id" },
      { $set: { title: "Updated" } },
      { returnDocument: "after" },
    );
    mockResumeFindOneAndUpdate.mockReset();
  });

  it("returns 404 when updating a resume outside the authenticated user's scope", async () => {
    const userId = "resume-owner";
    mockResumeFindOneAndUpdate.mockResolvedValue(null);

    const response = await request(app)
      .put("/api/resumes/update")
      .set("Authorization", `Bearer ${jwt.sign({ userId }, secret)}`)
      .send({ resumeId: "other-resume", resumeData: { title: "Changed" } });

    expect(response.status).toBe(404);
    expect(mockResumeFindOneAndUpdate).toHaveBeenCalledWith(
      { userId, _id: "other-resume" },
      { $set: { title: "Changed" } },
      { returnDocument: "after" },
    );
    mockResumeFindOneAndUpdate.mockReset();
  });

  it("returns 404 when deleting a resume outside the authenticated user's scope", async () => {
    const userId = "resume-owner";
    mockResumeFindOneAndDelete.mockResolvedValue(null);

    const response = await request(app)
      .delete("/api/resumes/delete/other-resume")
      .set("Authorization", `Bearer ${jwt.sign({ userId }, secret)}`);

    expect(response.status).toBe(404);
    expect(mockResumeFindOneAndDelete).toHaveBeenCalledWith({ userId, _id: "other-resume" });
    mockResumeFindOneAndDelete.mockReset();
  });

  it("returns 400 when an upload endpoint receives no file", async () => {
    const response = await request(app)
      .post("/api/optimizer/upload-resume-document")
      .set("Authorization", `Bearer ${token()}`);

    expect(response.status).toBe(400);
  });

  it("hides database errors from resume and analytics responses", async () => {
    mockResumeFindOne.mockRejectedValue(new Error("private database connection details"));

    const resumeResponse = await request(app)
      .get("/api/resumes/get/resume-id")
      .set("Authorization", `Bearer ${token()}`);
    const analyticsResponse = await request(app)
      .post("/api/analytics/match")
      .set("Authorization", `Bearer ${token()}`)
      .send({ resumeId: "resume-id", jobId: "job-id" });

    expect(resumeResponse.status).toBe(500);
    expect(resumeResponse.body).toEqual({ message: "Internal server error" });
    expect(analyticsResponse.status).toBe(500);
    expect(analyticsResponse.body).toEqual({ message: "Internal server error" });
    mockResumeFindOne.mockReset();
  });

  it("keeps malformed resume IDs as safe client errors", async () => {
    mockResumeFindOne.mockRejectedValue(Object.assign(new Error("private cast details"), { name: "CastError" }));

    const response = await request(app)
      .get("/api/resumes/get/invalid-id")
      .set("Authorization", `Bearer ${token()}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid resume ID" });
    mockResumeFindOne.mockReset();
  });
});
