import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  parseAndSaveJD,
  evaluateMatch,
  createResumeVersion,
  getResumeVersionsAnalytics,
  getDashboardMetrics,
} from "../controllers/analyticsController.js";

const analyticsRouter = express.Router();

// Protected analytics endpoints
analyticsRouter.post("/jd/parse", protect, parseAndSaveJD);
analyticsRouter.post("/match", protect, evaluateMatch);
analyticsRouter.post("/versions/create", protect, createResumeVersion);
analyticsRouter.get("/versions/:resumeId", protect, getResumeVersionsAnalytics);
analyticsRouter.get("/dashboard", protect, getDashboardMetrics);

export default analyticsRouter;
