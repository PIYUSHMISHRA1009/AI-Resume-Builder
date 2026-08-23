import mongoose from "mongoose";

const BulletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    index: true,
  },
  text: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    enum: ["summary", "skill", "experience", "project"],
    default: "experience",
    index: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Embedding vector stored as float array.
  // Atlas Vector Search index is configured at the DB level on this path.
  // In-memory cosine fallback also reads this array directly.
  embedding: {
    type: [Number],
  },
}, { timestamps: true });

const Bullet = mongoose.model("Bullet", BulletSchema);

export default Bullet;
