import mongoose from "mongoose";

const JobDescriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    default: "Target Company",
  },
  category: {
    type: String,
    enum: ["Business Technology", "Data Analytics", "Technology Consulting", "Software Engineering", "General"],
    default: "Business Technology",
    index: true,
  },
  rawText: {
    type: String,
    required: true,
  },
  extractedRequirements: {
    technicalSkills: [{ type: String }],
    softSkills: [{ type: String }],
    tools: [{ type: String }],
    domainSkills: [{ type: String }],
    responsibilities: [{ type: String }],
    experienceYears: { type: Number, default: 0 },
    educationLevel: { type: String, default: "Bachelor" },
  },
}, { timestamps: true });

const JobDescription = mongoose.model("JobDescription", JobDescriptionSchema);

export default JobDescription;
