import Resume from "../models/Resume.js";
import JobDescription from "../models/JobDescription.js";
import { generateOptimizationRecommendations, AiRateLimitError, AiProviderUnavailableError, AiTimeoutError, AiMalformedResponseError } from "../services/optimizerService.js";

export const getOptimization = async (req, res) => {
  try {
    const userId = req.userId;
    const { resumeId, jobId } = req.body;

    if (!resumeId || !jobId) {
      return res.status(400).json({ message: "resumeId and jobId are required" });
    }

    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    const jd = await JobDescription.findOne({ _id: jobId, userId });
    if (!jd) {
      return res.status(404).json({ message: "Job Description not found" });
    }

    const result = await generateOptimizationRecommendations(resume, jd);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AiRateLimitError) {
      return res.status(429).json({ message: error.message });
    }
    if (error instanceof AiProviderUnavailableError) {
      return res.status(503).json({ message: error.message });
    }
    if (error instanceof AiTimeoutError) {
      return res.status(504).json({ message: error.message });
    }
    if (error instanceof AiMalformedResponseError) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};
