import Resume from "../models/Resume.js";
import Bullet from "../models/Bullet.js";
import RAGEvalLog from "../models/RAGEvalLog.js";
import RefinementFeedback from "../models/RefinementFeedback.js";
import ai from "../configs/ai.js";
import { tailorResume, indexResumeBullets, analyzeSkillGaps, refineBullet } from "../services/ragService.js";

const extractProviderError = (error) => {
  if (!error) return "Unknown error";
  if (error.message) return error.message;
  if (error.response?.data?.error?.message) return error.response.data.error.message;
  if (error.code) return `Provider error (${error.code})`;
  return "AI provider request failed";
};


//controller for enhancing a resume's professional summary
//POST : /api/ai/enhance-pro-sum

export const enhanceProfessionalSummary = async (req, res) => {
    try {
        const { userContent } = req.body;

        if (!userContent) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const response = await ai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are an expert in resume writing. Your task is to enhance the professional summary of a resume. The summary should be 1-2 sentences also highlighting key skills, experience, and career objectives. Make it compelling and ATS-friendly. and only return text no options or anything else."
                },
                {
                    role: "user",
                    content: userContent,
                },
            ],
        });

        const enhancedContent = response.choices[0].message.content;
        return res.status(200).json({ enhancedContent });

    } catch (error) {
        const providerError = extractProviderError(error);
        console.error("enhanceProfessionalSummary error:", providerError);
        return res.status(400).json({ message: providerError });
    }
};



//controller for enhancing a resume's job description
//POST:/api/ai/enhance-job-desc

export const enhanceJobDescription = async (req, res) => {
    try {
        const { userContent } = req.body;

        if (!userContent) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const response = await ai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are an expert in resume writing. Your task is to enhance the job description of a resume. The job description should be only in 1-2 sentence also highlighting key responsibilities and achievements. Use action verbs and quantifiable results where possible. Make it ATS-friendly. and only return text no options or anything else."
                },
                {
                    role: "user",
                    content: userContent,
                },
            ],
        });

        const enhancedContent = response.choices[0].message.content;
        return res.status(200).json({ enhancedContent });

    } catch (error) {
        const providerError = extractProviderError(error);
        console.error("enhanceJobDescription error:", providerError);
        return res.status(502).json({ message: providerError });
    }
};



//controller for uploading a resume to the database
//POST:/api/ai/upload-resume

export const uploadResume = async (req, res) => {
    try {
        const { resumeText, title } = req.body;

        const userId = req.userId;

        if (!resumeText) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const systemPrompt = "You are an expert AI Agent to extract data from resume.";

        const userPrompt = `extract data from this resume: ${resumeText}

        Provide data in the following JSON format with no additional text before or after:
        {
            professional_summary:{
        type:String,
        default:''
    },
    skills:[{
        type:String,
    }],
    personal_info:{
        image:{type:String,default:' '},
        full_name:{ type:String,default:' '},
        profession:{ type:String,default:' '},
        email:{ type:String,default:' '},
        phone:{ type:String,default:' '},
        location:{ type:String,default:' '},
        linkedin:{ type:String,default:' '},
        website:{ type:String,default:' '},
    },
    experience:[
        {
            company:{type:String},
            position:{type:String},
            start_date:{type:String},
            end_date:{type:String},
            description:{type:String},
            is_current:{type:Boolean},
        }
    ],
    project:[
        {
            name:{type:String},
            type:{type:String},
            description:{type:String},
        }
    ],
    education:[
        {
            institution:{type:String},
            degree:{type:String},
            field:{type:String},
            graduation_date:{type:String},
            gpa:{type:String},
        }
        ]
        }`;

        const response = await ai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt,
                },
            ],
            response_format: { type: 'json_object' }
        });

        const extractedData = response.choices[0].message.content;
        const parsedData = JSON.parse(extractedData);

        const newResume = await Resume.create({ userId, title, ...parsedData });

        // Auto-index resume bullets into RAG vector store (non-blocking —
        // a failed index does not break the upload flow)
        try {
            await indexResumeBullets(newResume._id, userId);
        } catch (err) {
            console.error("RAG indexing failed (non-blocking):", err.message);
        }

        res.json(newResume);

    } catch (error) {
        const providerError = extractProviderError(error);
        console.error("uploadResume error:", providerError);
        return res.status(500).json({ message: providerError });
    }
};



//controller for RAG-tailored resume bullets
//POST : /api/ai/tailor-resume

export const tailorResumeController = async (req, res) => {
    try {
        const { jd_text, resume_id } = req.body;
        const userId = req.userId;

        if (!jd_text) {
            return res.status(400).json({ message: 'jd_text is required' });
        }

        const topK = parseInt(process.env.RAG_TOP_K || "5");
        const result = await tailorResume(userId, jd_text, resume_id, topK);

        return res.status(200).json({
            tailoredBullets: result.tailoredBullets,
            retrievedContext: result.retrievedContext,
            hitRate: result.hitRate,
            latencyMs: result.latencyMs,
        });

    } catch (error) {
        const providerError = extractProviderError(error);
        console.error("tailorResumeController error:", providerError);
        return res.status(502).json({ message: providerError });
    }
};



//controller for indexing resume bullets into the vector store
//POST:/api/ai/index-resume

export const indexResumeBulletsController = async (req, res) => {
    try {
        const { resume_id } = req.body;
        const userId = req.userId;

        if (!resume_id) {
            return res.status(400).json({ message: 'resume_id is required' });
        }

        const created = await indexResumeBullets(resume_id, userId);

        return res.status(201).json({
            message: 'Bullets indexed successfully',
            count: created.length,
            sources: Array.from(new Set(created.map(c => c.source))),
        });

    } catch (error) {
        const providerError = extractProviderError(error);
        console.error("indexResumeBulletsController error:", providerError);
        return res.status(500).json({ message: providerError });
    }
};



//controller for retrieving RAG eval logs (manual spot-check)
//GET:/api/ai/rag-logs?limit=10

export const getRagLogsController = async (req, res) => {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit || "10");

        const logs = await RAGEvalLog.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('-__v');

        return res.status(200).json({ logs });

    } catch (error) {
        const providerError = extractProviderError(error);
        console.error("getRagLogsController error:", providerError);
        return res.status(500).json({ message: providerError });
    }
};

  export const refineBulletController = async (req, res) => {
    try {
      const { bulletId, userFeedback, conversationHistory = [] } = req.body;
      const userId = req.userId;

      if (!bulletId || !userFeedback) {
        return res.status(400).json({ message: 'bulletId and userFeedback are required' });
      }

      // Refine the bullet using the ragService function
      const refinedText = await refineBullet(userId, bulletId, userFeedback, conversationHistory);

      // Save feedback to the database
      // We need the original bullet text to store in feedback.
      // refineBullet already validated ownership, so the bullet is guaranteed to exist.
      const bullet = await Bullet.findById(bulletId).where({ userId });

      const feedback = new RefinementFeedback({
        userId,
        bulletId,
        originalText: bullet.text,
        refinedText,
        feedback: userFeedback,
      });

      await feedback.save();

      res.json({
        refinedText,
        bulletId,
      });
    } catch (error) {
      const providerError = extractProviderError(error);
      console.error("refineBulletController error:", providerError);
      res.status(500).json({ message: providerError });
    }
  };

  export const skillGapAnalysisController = async (req, res) => {
    try {
      const { jdText, threshold = 0.4 } = req.body;
      const userId = req.userId;

      if (!jdText) {
        return res.status(400).json({ message: 'jdText is required' });
      }

      // Get skill gaps from ragService
      const skillGaps = await analyzeSkillGaps(userId, jdText, threshold);

      // Define a map of skills to learning resources (simplified)
      // In a real application, this could be a database or external service
      const learningResources = {
        "Node.js": "https://nodejs.org/en/learn",
        "React": "https://reactjs.org/tutorial/tutorial.html",
        "MongoDB": "https://www.mongodb.com/docs/manual/getting-started/",
        "Python": "https://docs.python.org/3/tutorial/",
        "AWS": "https://aws.amazon.com/getting-started/",
        "Docker": "https://docs.docker.com/get-started/",
        "Kubernetes": "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
        "JavaScript": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/A_guide_to_javascript",
        "Java": "https://docs.oracle.com/javase/tutorial/",
        "Spring Boot": "https://spring.io/guides/gs/spring-boot/",
        // Add more as needed
      };

      // Enhance each skill gap with learning resource suggestions
      const enhancedSkillGaps = skillGaps.map(gap => {
        const resource = learningResources[gap.skill];
        return {
          ...gap,
          learningResource: resource || `Consider exploring online courses and tutorials for ${gap.skill}`
        };
      });

      res.json({
        skillGaps: enhancedSkillGaps,
      });
    } catch (error) {
      const providerError = extractProviderError(error);
      console.error("skillGapAnalysisController error:", providerError);
      res.status(500).json({ message: providerError });
    }
  };