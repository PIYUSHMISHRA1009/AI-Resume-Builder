import express from "express";
import protect from "../middlewares/authMiddleware.js";
import aiRateLimit from "../middlewares/aiRateLimit.js";
import { getOptimization } from "../controllers/optimizerController.js";

const optimizerRouter = express.Router();

optimizerRouter.post("/optimize", protect, aiRateLimit, getOptimization);

export default optimizerRouter;
