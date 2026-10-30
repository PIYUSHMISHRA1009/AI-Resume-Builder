import ai from "../configs/ai.js";

/**
 * Generate natural language explanation for match results using supporting LLM.
 * @param {Object} matchRecord Calculated deterministic match record
 * @param {string} jdTitle Title of the target job
 * @returns {Promise<string>} Natural language advice
 */
export const generateMatchExplanation = async (matchRecord, jdTitle = "Target Role") => {
  try {
    const { overallScore, breakdownScores, skillEvidences, matchedSkillsCount, missingSkillsCount } = matchRecord;

    const strongMatches = skillEvidences
      .filter(e => e.status === "MATCHED" && e.evidenceStrength === "Strong")
      .map(e => e.skill)
      .slice(0, 5);

    const missingSkills = skillEvidences
      .filter(e => e.status === "MISSING")
      .map(e => e.skill)
      .slice(0, 5);

    const prompt = `
    Target Role: ${jdTitle}
    Overall Candidate-JD Match Score: ${overallScore}%
    Breakdown: Technical (${breakdownScores.technicalScore}%), Soft Skills (${breakdownScores.softSkillScore}%), Experience (${breakdownScores.experienceScore}%), Projects (${breakdownScores.projectScore}%), Education (${breakdownScores.educationScore}%).
    Strong Evidence Matches: ${strongMatches.join(", ") || "None"}
    Missing Key Skills: ${missingSkills.join(", ") || "None"}

    Provide a concise, 3-bullet executive evaluation explaining:
    1. Why the score is ${overallScore}%.
    2. Primary strengths demonstrated in the resume evidence.
    3. Actionable next steps to improve candidate alignment for ${jdTitle}.
    Keep it direct, professional, and grounded in the data.
    `;

    const response = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a Business Technology Career Consultant. Synthesize direct, empirical advice based strictly on calculated match analytics.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return response.choices[0]?.message?.content || "Candidate match evaluation complete based on calculated metrics.";
  } catch {
    console.error("AI Explanation fallback: provider request failed");
    return `Candidate-JD Match Score is ${matchRecord.overallScore}%. Score is calculated deterministically based on ${matchRecord.matchedSkillsCount} matched skills and ${matchRecord.missingSkillsCount} skill gaps.`;
  }
};
