import mongoose from "mongoose";

const SkillEvidenceSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  canonicalSkill: { type: String, required: true },
  category: { type: String, default: "Technical" },
  status: { type: String, enum: ["MATCHED", "PARTIAL", "MISSING"], required: true },
  evidenceQuote: { type: String, default: "" },
  evidenceSource: { type: String, enum: ["experience", "project", "summary", "skills_list", "none"], default: "none" },
  evidenceStrength: { type: String, enum: ["Strong", "Moderate", "Weak", "None"], default: "None" },
  rationale: { type: String, default: "" },
}, { _id: false });

const MatchRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    required: true,
    index: true,
  },
  versionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ResumeVersion",
    default: null,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobDescription",
    required: true,
    index: true,
  },
  overallScore: {
    type: Number,
    required: true,
  },
  breakdownScores: {
    technicalScore: { type: Number, default: 0 },
    softSkillScore: { type: Number, default: 0 },
    experienceScore: { type: Number, default: 0 },
    projectScore: { type: Number, default: 0 },
    educationScore: { type: Number, default: 0 },
  },
  weightsUsed: {
    wTech: { type: Number, default: 0.40 },
    wSoft: { type: Number, default: 0.15 },
    wExp: { type: Number, default: 0.20 },
    wProj: { type: Number, default: 0.15 },
    wEdu: { type: Number, default: 0.10 },
  },
  skillEvidences: [SkillEvidenceSchema],
  matchedSkillsCount: { type: Number, default: 0 },
  missingSkillsCount: { type: Number, default: 0 },
  partialSkillsCount: { type: Number, default: 0 },
}, { timestamps: true });

const MatchRecord = mongoose.model("MatchRecord", MatchRecordSchema);

export default MatchRecord;
