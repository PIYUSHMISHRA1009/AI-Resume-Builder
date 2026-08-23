import mongoose from "mongoose";

const RefinementFeedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  bulletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bullet",
    required: true,
    index: true,
  },
  originalText: {
    type: String,
    required: true,
  },
  refinedText: {
    type: String,
    required: true,
  },
  feedback: {
    type: String, // the user's feedback text
    required: true,
  },
}, { timestamps: true });

const RefinementFeedback = mongoose.model("RefinementFeedback", RefinementFeedbackSchema);

export default RefinementFeedback;