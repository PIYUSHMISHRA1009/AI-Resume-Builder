import mongoose from "mongoose";

const ResumeVersionSchema = new mongoose.Schema({
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  versionNumber: {
    type: Number,
    required: true,
  },
  versionTitle: {
    type: String,
    required: true,
  },
  structuredData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  notes: {
    type: String,
    default: "",
  },
}, { timestamps: true });

// Compound unique index for resumeId + versionNumber
ResumeVersionSchema.index({ resumeId: 1, versionNumber: 1 }, { unique: true });

const ResumeVersion = mongoose.model("ResumeVersion", ResumeVersionSchema);

export default ResumeVersion;
