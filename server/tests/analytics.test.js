import assert from "assert";
import { normalizeSkill, normalizeSkillList } from "../services/normalizationService.js";
import { extractSkillEvidence } from "../services/evidenceService.js";
import { calculateCandidateJDMatch, DEFAULT_WEIGHTS } from "../services/matchingService.js";
import { syncDataToSQLite } from "../services/analyticsSyncService.js";
import {
  getMostDemandedSkills,
  getCategorySkillCoverage,
  getVersionProgression,
  getSkillGapRankings,
} from "../services/sqlAnalyticsService.js";

console.log("=== Running Analytics & Normalization Test Suite ===");

// Test 1: Skill Normalization
console.log("\n1. Testing Skill Normalization Layer...");
assert.strictEqual(normalizeSkill("Postgres"), "POSTGRESQL");
assert.strictEqual(normalizeSkill("PostgreSQL DB"), "POSTGRESQL");
assert.strictEqual(normalizeSkill("powerbi"), "POWER BI");
assert.strictEqual(normalizeSkill("Power BI"), "POWER BI");
assert.strictEqual(normalizeSkill("ml"), "MACHINE LEARNING");
assert.strictEqual(normalizeSkill("Machine Learning"), "MACHINE LEARNING");
assert.strictEqual(normalizeSkill("python3"), "PYTHON");

const normalizedList = normalizeSkillList(["Postgres", "Power BI", "PostgreSQL DB", "Python"]);
assert.strictEqual(normalizedList.length, 3, "Duplicates should be merged");
assert.strictEqual(normalizedList[0].canonical, "POSTGRESQL");
assert.strictEqual(normalizedList[1].canonical, "POWER BI");
assert.strictEqual(normalizedList[2].canonical, "PYTHON");
console.log("✓ Skill Normalization tests passed");

// Test 2: Evidence Extraction Engine
console.log("\n2. Testing Evidence Extraction Engine...");
const mockResume = {
  skills: ["Python", "SQL", "Power BI"],
  experience: [
    {
      company: "Analytics Corp",
      position: "Data Analyst",
      description: "Optimized PostgreSQL queries, reducing latency by 45%\nBuilt automated ETL pipelines",
    },
  ],
  project: [
    {
      name: "Sentinel Analytics",
      type: "Data Analytics",
      description: "Developed machine learning model with 92% accuracy in Python",
    },
  ],
  education: [
    { degree: "Bachelor of Technology", institution: "IIT" }
  ],
};

const evPostgres = extractSkillEvidence("PostgreSQL", mockResume);
assert.strictEqual(evPostgres.status, "MATCHED");
assert.strictEqual(evPostgres.evidenceStrength, "Strong", "Should be Strong due to metric % and action verb");
assert.ok(evPostgres.evidenceQuote.includes("PostgreSQL"));

const evPowerBI = extractSkillEvidence("Power BI", mockResume);
assert.strictEqual(evPowerBI.status, "PARTIAL");
assert.strictEqual(evPowerBI.evidenceStrength, "Weak", "Listed only in skills array");

const evDocker = extractSkillEvidence("Docker", mockResume);
assert.strictEqual(evDocker.status, "MISSING");
assert.strictEqual(evDocker.evidenceStrength, "None");
console.log("✓ Evidence Extraction tests passed");

// Test 3: Deterministic Matching Engine
console.log("\n3. Testing Deterministic Matching Engine...");
const mockJD = {
  title: "Business Technology Solutions Associate",
  category: "Business Technology",
  extractedRequirements: {
    technicalSkills: ["PostgreSQL", "Python", "ETL"],
    tools: ["Power BI"],
    softSkills: ["Problem Solving"],
    experienceYears: 2,
    educationLevel: "Bachelor",
  },
};

const matchResult = calculateCandidateJDMatch(mockResume, mockJD);
assert.ok(matchResult.overallScore > 0 && matchResult.overallScore <= 100);
assert.ok(matchResult.breakdownScores.technicalScore >= 70);
assert.strictEqual(matchResult.matchedSkillsCount, 3);
assert.strictEqual(matchResult.partialSkillsCount, 1);
console.log("✓ Deterministic Matching Engine tests passed");

// Test 4: SQL Analytics Engine & SQLite Ingestion
console.log("\n4. Testing SQL Analytics Engine & SQLite Integration...");
(async () => {
  try {
    const mockUser = { _id: "507f1f77bcf86cd799439011", name: "Test User", email: "test@example.com" };
    const mockJDObj = {
      _id: "507f1f77bcf86cd799439022",
      userId: mockUser._id,
      title: "Business Technology Associate",
      company: "ZS",
      category: "Business Technology",
      extractedRequirements: {
        technicalSkills: ["PostgreSQL", "Python", "ETL", "SQL"],
        tools: ["Power BI"],
        softSkills: ["Communication"],
      },
    };
    const mockVer1 = {
      _id: "507f1f77bcf86cd799439033",
      resumeId: "507f1f77bcf86cd799439044",
      userId: mockUser._id,
      versionNumber: 1,
      versionTitle: "Resume v1",
    };
    const mockVer2 = {
      _id: "507f1f77bcf86cd799439034",
      resumeId: "507f1f77bcf86cd799439044",
      userId: mockUser._id,
      versionNumber: 2,
      versionTitle: "Resume v2",
    };
    const mockMatch1 = {
      _id: "507f1f77bcf86cd799439055",
      userId: mockUser._id,
      resumeId: mockVer1.resumeId,
      versionId: mockVer1._id,
      jobId: mockJDObj._id,
      jobTitle: mockJDObj.title,
      overallScore: 72,
      breakdownScores: { technicalScore: 70, softSkillScore: 80, experienceScore: 75, projectScore: 65, educationScore: 80 },
      matchedSkillsCount: 3,
      missingSkillsCount: 2,
      skillEvidences: [
        { skill: "Power BI", canonicalSkill: "POWER BI", status: "MISSING", category: "Tool" }
      ]
    };
    const mockMatch2 = {
      _id: "507f1f77bcf86cd799439056",
      userId: mockUser._id,
      resumeId: mockVer1.resumeId,
      versionId: mockVer2._id,
      jobId: mockJDObj._id,
      jobTitle: mockJDObj.title,
      overallScore: 86,
      breakdownScores: { technicalScore: 88, softSkillScore: 80, experienceScore: 85, projectScore: 85, educationScore: 80 },
      matchedSkillsCount: 5,
      missingSkillsCount: 0,
      skillEvidences: []
    };

    await syncDataToSQLite({
      users: [mockUser],
      jds: [mockJDObj],
      versions: [mockVer1, mockVer2],
      matches: [mockMatch1, mockMatch2],
    });

    const demanded = await getMostDemandedSkills(5);
    assert.ok(demanded.length > 0, "Most demanded skills query should return rows");

    const categoryCoverage = await getCategorySkillCoverage(mockUser._id);
    assert.ok(categoryCoverage.length > 0, "Category coverage query should return rows");

    const progression = await getVersionProgression(mockUser._id, mockVer1.resumeId);
    assert.strictEqual(progression.length, 2, "Should return 2 version iterations");
    assert.strictEqual(progression[1].score_improvement, 14, "v2 score improvement delta should be +14");

    console.log("✓ SQL Analytics Engine tests passed");
    console.log("\n=== ALL TEST SUITES PASSED CLEANLY ===");
  } catch (err) {
    console.error("❌ SQL Analytics Test Failed:", err);
    process.exit(1);
  }
})();
