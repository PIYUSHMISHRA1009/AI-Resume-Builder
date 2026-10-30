import "dotenv/config";
import ai from "../configs/ai.js";
import { calculateCandidateJDMatch } from "./matchingService.js";
import { generateMatchExplanation } from "./explanationService.js";
import Resume from "../models/Resume.js";
import JobDescription from "../models/JobDescription.js";

const MAX_RECOMMENDATIONS = 5;
const MAX_OUTPUT_TOKENS = 1024;

const normalizeAiText = (value) => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => JSON.stringify(item)).join("\n");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "");
};

const buildCondensedResume = (resume) => {
  const experience = (resume.experience || []).slice(0, 5).map((exp) => ({
    company: exp.company,
    position: exp.position,
    description: exp.description,
    is_current: exp.is_current,
  }));

  const projects = (resume.project || []).slice(0, 5).map((proj) => ({
    name: proj.name,
    type: proj.type,
    description: proj.description,
  }));

  const education = (resume.education || []).slice(0, 3).map((edu) => ({
    institution: edu.institution,
    degree: edu.degree,
    field: edu.field,
  }));

  return {
    professional_summary: normalizeAiText(resume.professional_summary),
    skills: (resume.skills || []).slice(0, 30),
    experience,
    projects,
    education,
  };
};

const looksPathological = (text) => {
  if (typeof text !== "string") return false;
  if (text.includes("0x30")) return true;
  if (text.includes("[object Object]")) return true;
  const repeated = text.match(/(.)\1{50,}/);
  if (repeated) return true;
  return false;
};

const extractJsonFromModelOutput = (raw) => {
  if (typeof raw !== "string") {
    throw new Error("Model returned non-string content");
  }

  const trimmed = raw.trim();

  const jsonFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonFence) {
    return JSON.parse(jsonFence[1].trim());
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  return JSON.parse(trimmed);
};

export class AiRateLimitError extends Error {
  constructor(message = "AI recommendations are temporarily unavailable due to provider rate limits. Please try again shortly.") {
    super(message);
    this.name = "AiRateLimitError";
  }
}

export class AiProviderUnavailableError extends Error {
  constructor(message = "AI recommendations are temporarily unavailable. Please try again shortly.") {
    super(message);
    this.name = "AiProviderUnavailableError";
  }
}

export class AiTimeoutError extends Error {
  constructor(message = "AI recommendation request timed out. Please try again.") {
    super(message);
    this.name = "AiTimeoutError";
  }
}

export class AiMalformedResponseError extends Error {
  constructor(message = "AI recommendations could not be generated. Please try again.") {
    super(message);
    this.name = "AiMalformedResponseError";
  }
}

export const generateOptimizationRecommendations = async (resume, jd) => {
  const matchResult = calculateCandidateJDMatch(resume, jd);

  const strongMatches = matchResult.skillEvidences
    .filter((e) => e.status === "MATCHED" && e.evidenceStrength === "Strong")
    .map((e) => e.skill)
    .slice(0, 10);

  const missingSkills = matchResult.skillEvidences
    .filter((e) => e.status === "MISSING")
    .map((e) => e.skill)
    .slice(0, 10);

  const partialSkills = matchResult.skillEvidences
    .filter((e) => e.status === "PARTIAL" || e.evidenceStrength === "Weak")
    .map((e) => ({
      skill: e.skill,
      category: e.category,
      evidenceStrength: e.evidenceStrength,
      evidenceSource: e.evidenceSource,
    }))
    .slice(0, 10);

  const condensedResume = buildCondensedResume(resume);

  const systemPrompt = `You are a resume optimization assistant. Your task is to analyze a resume against a job description and provide specific, evidence-based recommendations for improvement.

CRITICAL RULES:
1. NEVER invent experience, companies, projects, technologies, metrics, achievements, or job titles that are not explicitly present in the resume.
2. ONLY suggest rephrasing, reordering, or adding keywords from the JD where the resume ALREADY contains supporting evidence.
3. Distinguish between: (a) skills already present but not well surfaced, (b) skills mentioned in JD but missing from resume, (c) transferable skills, (d) skills that should NOT be added without evidence.
4. Each recommendation must include: section, index (0-based array index within that section), field, priority, what, why, where, how, currentText, and suggestedText.
5. Return ONLY a valid JSON object with keys: recommendations, summary.
6. Return AT MOST 5 recommendations. Prefer 3-5 high-impact recommendations.
7. Do NOT rewrite the entire resume. Do NOT return an optimizedResume field.
8. Keep each recommendation concise.`;

  const userPrompt = `Resume Data:
${JSON.stringify(condensedResume, null, 2)}

Job Description:
${jd.title || "Target Role"}
${jd.rawText || ""}

Extracted Requirements:
${JSON.stringify(jd.extractedRequirements || {}, null, 2)}

Match Result:
- Overall Score: ${matchResult.overallScore}%
- Technical: ${matchResult.breakdownScores.technicalScore}%
- Soft Skills: ${matchResult.breakdownScores.softSkillScore}%
- Experience: ${matchResult.breakdownScores.experienceScore}%
- Projects: ${matchResult.breakdownScores.projectScore}%
- Education: ${matchResult.breakdownScores.educationScore}%

Strong Matches: ${strongMatches.join(", ") || "None"}
Partial/Weak Skills: ${partialSkills.map((p) => p.skill).join(", ") || "None"}
Missing Skills: ${missingSkills.join(", ") || "None"}

Provide up to 5 concise optimization recommendations. Return ONLY JSON.`;

  try {
    const response = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: MAX_OUTPUT_TOKENS,
    });

    const rawContent = response.choices[0]?.message?.content;

    if (!rawContent || looksPathological(rawContent)) {
      throw new Error("Model returned malformed or pathological output");
    }

    let parsed;
    try {
      parsed = extractJsonFromModelOutput(rawContent);
    } catch {
      throw new Error("Failed to parse model response as JSON");
    }

    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
          .filter((rec) => rec && typeof rec === "object")
          .slice(0, MAX_RECOMMENDATIONS)
      : [];

    const summary = {
      beforeScore: matchResult.overallScore,
      afterScore: matchResult.overallScore,
      improvement: 0,
      recommendationsCount: recommendations.length,
      strongMatches: strongMatches.length,
      missingSkills: missingSkills.length,
      partialSkills: partialSkills.length,
    };

    return {
      matchResult,
      aiExplanation: await generateMatchExplanation(matchResult, jd.title),
      recommendations,
      optimizedResume: resume,
      summary,
    };
  } catch (error) {
    const status = error.status;
    const isRateLimit = status === 429 || error.code === "rate_limit" || error.message?.toLowerCase().includes("rate limit");
    const isUnavailable = status === 503 || error.code === "service_unavailable" || error.message?.toLowerCase().includes("service unavailable");
    const isTimeout = error.code === "timeout" || error.message?.toLowerCase().includes("timeout") || error.message?.toLowerCase().includes("timed out");

    if (isRateLimit) {
      throw new AiRateLimitError();
    }
    if (isUnavailable) {
      throw new AiProviderUnavailableError();
    }
    if (isTimeout) {
      throw new AiTimeoutError();
    }

    const rawContent = error.response?.data?.error?.message || error.message;
    if (rawContent && looksPathological(String(rawContent))) {
      throw new AiMalformedResponseError();
    }

    throw new AiMalformedResponseError();
  }
};
