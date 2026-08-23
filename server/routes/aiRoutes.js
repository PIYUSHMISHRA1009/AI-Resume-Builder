import express from "express";
import protect from "../middlewares/authMiddleware.js";
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

aiRouter.post('/enhance-pro-sum',protect,enhanceProfessionalSummary)
aiRouter.post('/enhance-job-desc',protect,enhanceJobDescription)
aiRouter.post('/upload-resume',protect,uploadResume)

// RAG endpoints — ground resume generation in retrieved context
aiRouter.post('/tailor-resume',protect,tailorResumeController)
aiRouter.post('/index-resume',protect,indexResumeBulletsController)
aiRouter.get('/rag-logs',protect,getRagLogsController)
aiRouter.post('/refine-bullet',protect,refineBulletController)
aiRouter.post('/skill-gaps',protect,skillGapAnalysisController)


export default aiRouter
