import { normalizeSkill, getSkillCategory } from "./normalizationService.js";

/**
 * Metric & Action Verb indicators for Strong Evidence scoring
 */
const METRIC_REGEX = /\b(\d+%\b|\$\d+|\d+\+|\b\d+\s*(ms|sec|min|hours|k|k+|\+|users|requests|gb|tb|pb|records|datasets))\b/i;
const ACTION_VERB_REGEX = /\b(built|created|designed|developed|implemented|optimized|architected|engineered|led|directed|deployed|automated|reduced|increased|scaled|streamlined)\b/i;

/**
 * Extract evidence from resume for a target skill.
 * @param {string} targetSkill Raw or canonical skill name
 * @param {Object} resume Structured resume object
 * @returns {Object} { skill, canonicalSkill, category, status, evidenceQuote, evidenceSource, evidenceStrength, rationale }
 */
export const extractSkillEvidence = (targetSkill, resume) => {
  const canonicalTarget = normalizeSkill(targetSkill);
  const category = getSkillCategory(canonicalTarget);

  if (!resume) {
    return {
      skill: targetSkill,
      canonicalSkill: canonicalTarget,
      category,
      status: "MISSING",
      evidenceQuote: "",
      evidenceSource: "none",
      evidenceStrength: "None",
      rationale: "No supporting resume context found.",
    };
  }

  // Regex to match target skill or common variants in text
  const escapedTarget = targetSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const targetRegex = new RegExp(`\\b${escapedTarget}\\b`, 'i');

  // Search 1: Experience section (highest weight)
  if (Array.isArray(resume.experience)) {
    for (const exp of resume.experience) {
      if (exp.description) {
        const lines = exp.description.split(/\r?\n/);
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && (targetRegex.test(trimmedLine) || normalizeSkill(trimmedLine).includes(canonicalTarget))) {
            const hasMetric = METRIC_REGEX.test(trimmedLine);
            const hasActionVerb = ACTION_VERB_REGEX.test(trimmedLine);
            const strength = (hasMetric || hasActionVerb) ? "Strong" : "Moderate";

            return {
              skill: targetSkill,
              canonicalSkill: canonicalTarget,
              category,
              status: "MATCHED",
              evidenceQuote: trimmedLine,
              evidenceSource: "experience",
              evidenceStrength: strength,
              rationale: `Demonstrated in work experience at ${exp.company || 'Company'} (${strength} evidence).`,
            };
          }
        }
      }
    }
  }

  // Search 2: Project section
  if (Array.isArray(resume.project)) {
    for (const proj of resume.project) {
      if (proj.description) {
        const lines = proj.description.split(/\r?\n/);
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && (targetRegex.test(trimmedLine) || normalizeSkill(trimmedLine).includes(canonicalTarget))) {
            const hasMetric = METRIC_REGEX.test(trimmedLine);
            const hasActionVerb = ACTION_VERB_REGEX.test(trimmedLine);
            const strength = (hasMetric || hasActionVerb) ? "Strong" : "Moderate";

            return {
              skill: targetSkill,
              canonicalSkill: canonicalTarget,
              category,
              status: "MATCHED",
              evidenceQuote: trimmedLine,
              evidenceSource: "project",
              evidenceStrength: strength,
              rationale: `Applied in project '${proj.name || 'Project'}' (${strength} evidence).`,
            };
          }
        }
      }
    }
  }

  // Search 3: Professional Summary
  if (resume.professional_summary && targetRegex.test(resume.professional_summary)) {
    return {
      skill: targetSkill,
      canonicalSkill: canonicalTarget,
      category,
      status: "MATCHED",
      evidenceQuote: resume.professional_summary,
      evidenceSource: "summary",
      evidenceStrength: "Moderate",
      rationale: "Highlighted in professional summary.",
    };
  }

  // Search 4: Skills list only
  if (Array.isArray(resume.skills)) {
    const hasInSkillsList = resume.skills.some(s => s && normalizeSkill(s) === canonicalTarget);
    if (hasInSkillsList) {
      return {
        skill: targetSkill,
        canonicalSkill: canonicalTarget,
        category,
        status: "PARTIAL",
        evidenceQuote: `Listed in skills array: ${targetSkill}`,
        evidenceSource: "skills_list",
        evidenceStrength: "Weak",
        rationale: "Skill is explicitly listed in skills section, but lacks detailed narrative context or metric evidence.",
      };
    }
  }

  // Fallback: Missing
  return {
    skill: targetSkill,
    canonicalSkill: canonicalTarget,
    category,
    status: "MISSING",
    evidenceQuote: "",
    evidenceSource: "none",
    evidenceStrength: "None",
    rationale: "No supporting evidence found in experience, projects, or summary.",
  };
};

/**
 * Extract evidence for all skills required by a Job Description.
 * @param {Array<string>} requiredSkills
 * @param {Object} resume
 * @returns {Array<Object>}
 */
export const extractAllSkillEvidences = (requiredSkills = [], resume = {}) => {
  if (!Array.isArray(requiredSkills)) return [];
  return requiredSkills.map(skill => extractSkillEvidence(skill, resume));
};
