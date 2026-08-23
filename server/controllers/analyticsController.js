import Resume from "../models/Resume.js";
import JobDescription from "../models/JobDescription.js";
import ResumeVersion from "../models/ResumeVersion.js";
import MatchRecord from "../models/MatchRecord.js";
import User from "../models/User.js";
import { calculateCandidateJDMatch } from "../services/matchingService.js";
import { syncDataToSQLite } from "../services/analyticsSyncService.js";
import { getDashboardAnalytics, getVersionProgression } from "../services/sqlAnalyticsService.js";
import { generateMatchExplanation } from "../services/explanationService.js";
import { normalizeSkillList } from "../services/normalizationService.js";

/**
 * Controller: Parse and Save target Job Description
 * POST /api/analytics/jd/parse
 */
export const parseAndSaveJD = async (req, res) => {
  try {
    const userId = req.userId;
    const { title, company, category, rawText, extractedRequirements } = req.body;

    if (!title || !rawText) {
      return res.status(400).json({ message: "Title and rawText are required" });
    }

    let requirements = extractedRequirements;
    if (!requirements || typeof requirements !== "object") {
      // Basic extraction fallback from rawText
      const techList = [];
      const softList = [];
      const sampleTech = ["SQL", "Python", "PostgreSQL", "Tableau", "Power BI", "ETL", "Excel", "AWS", "MongoDB", "R"];
      const sampleSoft = ["Communication", "Problem Solving", "Stakeholder Management", "Agile"];

      sampleTech.forEach(t => {
        if (new RegExp(`\\b${t}\\b`, "i").test(rawText)) techList.push(t);
      });
      sampleSoft.forEach(s => {
        if (new RegExp(`\\b${s}\\b`, "i").test(rawText)) softList.push(s);
      });

      requirements = {
        technicalSkills: techList,
        softSkills: softList,
        tools: [],
        domainSkills: [],
        responsibilities: [],
        experienceYears: 2,
        educationLevel: "Bachelor",
      };
    }

    const jd = await JobDescription.create({
      userId,
      title,
      company: company || "Target Company",
      category: category || "Business Technology",
      rawText,
      extractedRequirements: requirements,
    });

    // Trigger SQLite ETL sync
    const users = await User.find({ _id: userId });
    await syncDataToSQLite({ users, jds: [jd] });

    return res.status(201).json({ message: "Job Description Saved Successfully", jd });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Controller: Evaluate Candidate-JD Match Score & Evidence
 * POST /api/analytics/match
 */
export const evaluateMatch = async (req, res) => {
  try {
    const userId = req.userId;
    const { resumeId, jobId, customWeights } = req.body;

    if (!resumeId || !jobId) {
      return res.status(400).json({ message: "resumeId and jobId are required" });
    }

    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    const jd = await JobDescription.findOne({ _id: jobId });
    if (!jd) {
      return res.status(404).json({ message: "Job Description not found" });
    }

    // Get latest version if available
    const latestVersion = await ResumeVersion.findOne({ resumeId, userId }).sort({ versionNumber: -1 });

    // Calculate deterministic match score & extract evidence
    const matchResult = calculateCandidateJDMatch(resume, jd, customWeights);

    // Save Match Record in MongoDB
    const matchRecord = await MatchRecord.create({
      userId,
      resumeId,
      versionId: latestVersion ? latestVersion._id : null,
      jobId,
      overallScore: matchResult.overallScore,
      breakdownScores: matchResult.breakdownScores,
      weightsUsed: matchResult.weightsUsed,
      skillEvidences: matchResult.skillEvidences,
      matchedSkillsCount: matchResult.matchedSkillsCount,
      partialSkillsCount: matchResult.partialSkillsCount,
      missingSkillsCount: matchResult.missingSkillsCount,
    });

    // Sync to SQLite OLAP Read-Model
    const user = await User.findById(userId);
    await syncDataToSQLite({
      users: user ? [user] : [],
      jds: [jd],
      versions: latestVersion ? [latestVersion] : [],
      matches: [{ ...matchRecord.toObject(), jobTitle: jd.title }],
    });

    // Synthesize LLM natural language explanation
    const aiExplanation = await generateMatchExplanation(matchResult, jd.title);

    return res.status(200).json({
      matchRecord,
      aiExplanation,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Controller: Create Resume Version Snapshot
 * POST /api/analytics/versions/create
 */
export const createResumeVersion = async (req, res) => {
  try {
    const userId = req.userId;
    const { resumeId, versionTitle, notes } = req.body;

    if (!resumeId) {
      return res.status(400).json({ message: "resumeId is required" });
    }

    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    const lastVersion = await ResumeVersion.findOne({ resumeId, userId }).sort({ versionNumber: -1 });
    const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    const version = await ResumeVersion.create({
      resumeId,
      userId,
      versionNumber,
      versionTitle: versionTitle || `Version ${versionNumber}`,
      structuredData: resume.toObject(),
      notes: notes || "",
    });

    const user = await User.findById(userId);
    await syncDataToSQLite({ users: user ? [user] : [], versions: [version] });

    return res.status(201).json({ message: "Resume Version Snapshot Created", version });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Controller: Get Resume Version Progression Analytics
 * GET /api/analytics/versions/:resumeId
 */
export const getResumeVersionsAnalytics = async (req, res) => {
  try {
    const userId = req.userId;
    const { resumeId } = req.params;

    const progression = await getVersionProgression(userId, resumeId);
    return res.status(200).json({ progression });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Controller: Executive Dashboard Analytics
 * GET /api/analytics/dashboard
 */
export const getDashboardMetrics = async (req, res) => {
  try {
    const userId = req.userId;
    const analytics = await getDashboardAnalytics(userId);
    return res.status(200).json({ analytics });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
