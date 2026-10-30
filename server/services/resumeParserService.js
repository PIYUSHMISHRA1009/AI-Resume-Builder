import ai from "../configs/ai.js";
import Resume from "../models/Resume.js";
import { indexResumeBullets } from "./ragService.js";

const systemPrompt = "You are an expert AI Agent to extract data from resume.";

const buildUserPrompt = (resumeText) => `extract data from this resume: ${resumeText}

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

export const parseResumeTextAndCreate = async (resumeText, title, userId) => {
  const response = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt(resumeText) },
    ],
    response_format: { type: "json_object" },
  });

  const extractedData = response.choices[0].message.content;
  const parsedData = JSON.parse(extractedData);

  const newResume = await Resume.create({ userId, title, ...parsedData });

  try {
    await indexResumeBullets(newResume._id, userId);
  } catch (err) {
    console.error("RAG indexing failed (non-blocking):", err.message);
  }

  return newResume;
};
