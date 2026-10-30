import express from "express";
import protect from "../middlewares/authMiddleware.js";
import aiRateLimit from "../middlewares/aiRateLimit.js";
import {
  enhanceJobDescription,
  enhanceProfessionalSummary,
  uploadResume,
  tailorResumeController,
  indexResumeBulletsController,
  getRagLogsController,
  refineBulletController,
  skillGapAnalysisController,
} from "../controllers/aiController.js";
import {updateResume} from "../controllers/ResumeController.js";


const aiRouter=express.Router();

aiRouter.post('/enhance-pro-sum',protect,aiRateLimit,enhanceProfessionalSummary)
aiRouter.post('/enhance-job-desc',protect,aiRateLimit,enhanceJobDescription)
aiRouter.post('/upload-resume',protect,aiRateLimit,uploadResume)

// RAG endpoints — ground resume generation in retrieved context
aiRouter.post('/tailor-resume',protect,aiRateLimit,tailorResumeController)
aiRouter.post('/index-resume',protect,aiRateLimit,indexResumeBulletsController)
aiRouter.get('/rag-logs',protect,aiRateLimit,getRagLogsController)
aiRouter.post('/refine-bullet',protect,aiRateLimit,refineBulletController)
aiRouter.post('/skill-gaps',protect,aiRateLimit,skillGapAnalysisController)


export default aiRouter
