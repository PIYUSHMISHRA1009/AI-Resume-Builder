import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { getOptimization } from "../controllers/optimizerController.js";

const optimizerRouter = express.Router();

optimizerRouter.post("/optimize", protect, getOptimization);

export default optimizerRouter;
