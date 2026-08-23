import mongoose from "mongoose";

const RetrievedItemSchema = new mongoose.Schema({
  bulletId: { type: mongoose.Schema.Types.ObjectId, ref: "Bullet" },
  text: { type: String },
  source: { type: String },
  score: { type: Number },
}, { _id: false });

const TailoredBulletSchema = new mongoose.Schema({
  bullet: { type: String },
  source_id: { type: String },
}, { _id: false });

const RAGEvalLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  jdText: {
    type: String,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    index: true,
  },
  topK: {
    type: Number,
  },
  retrieved: {
    type: [RetrievedItemSchema],
    default: [],
  },
  hitRate: {
    type: Number,
  },
  generatedBullets: {
    type: [TailoredBulletSchema],
    default: [],
  },
  latencyMs: {
    type: Number,
  },
}, { timestamps: true });

const RAGEvalLog = mongoose.model("RAGEvalLog", RAGEvalLogSchema);

export default RAGEvalLog;
