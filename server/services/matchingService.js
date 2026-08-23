import { extractAllSkillEvidences } from "./evidenceService.js";
import { normalizeSkill } from "./normalizationService.js";

/**
 * Default Configurable Initial Heuristic Weights
 */
export const DEFAULT_WEIGHTS = {
  wTech: 0.40,
  wSoft: 0.15,
  wExp: 0.20,
  wProj: 0.15,
  wEdu: 0.10,
};

/**
 * Evaluate Candidate-JD Match Score deterministically.
 *
 * @param {Object} resume Structured Resume Object
 * @param {Object} jd Structured Job Description Object
 * @param {Object} customWeights Optional override for heuristic weights
 * @returns {Object} Deterministic match evaluation record
 */
export const calculateCandidateJDMatch = (resume, jd, customWeights = {}) => {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  const extractedRequirements = jd.extractedRequirements || {
    technicalSkills: [],
    softSkills: [],
    tools: [],
    domainSkills: [],
    experienceYears: 0,
    educationLevel: "Bachelor",
  };

  // Combine technical skills, tools, and domain skills into tech requirements
  const techRequirements = [
    ...(extractedRequirements.technicalSkills || []),
    ...(extractedRequirements.tools || []),
    ...(extractedRequirements.domainSkills || []),
  ];

  const softRequirements = extractedRequirements.softSkills || [];

  // Extract evidence for technical requirements
  const techEvidences = extractAllSkillEvidences(techRequirements, resume);

  // Extract evidence for soft skill requirements
  const softEvidences = extractAllSkillEvidences(softRequirements, resume);

  // 1. Technical Skill Score Calculation
  let techScore = 0;
  if (techEvidences.length > 0) {
    const totalWeightPoints = techEvidences.reduce((acc, ev) => {
      if (ev.status === "MATCHED" && ev.evidenceStrength === "Strong") return acc + 1.0;
      if (ev.status === "MATCHED" && ev.evidenceStrength === "Moderate") return acc + 0.85;
      if (ev.status === "PARTIAL" || ev.evidenceStrength === "Weak") return acc + 0.50;
      return acc;
    }, 0);
    techScore = Math.min(100, Math.round((totalWeightPoints / techEvidences.length) * 100));
  } else {
    techScore = 80; // Baseline if no specific technical requirements in JD
  }

  // 2. Soft Skill Score Calculation
  let softScore = 0;
  if (softEvidences.length > 0) {
    const totalSoftPoints = softEvidences.reduce((acc, ev) => {
      if (ev.status === "MATCHED") return acc + 1.0;
      if (ev.status === "PARTIAL") return acc + 0.5;
      return acc;
    }, 0);
    softScore = Math.min(100, Math.round((totalSoftPoints / softEvidences.length) * 100));
  } else {
    softScore = 80;
  }

  // 3. Experience Alignment Score Calculation
  let expScore = 70;
  const candidateExperiences = resume.experience || [];
  const requiredYears = extractedRequirements.experienceYears || 0;

  if (candidateExperiences.length > 0) {
    let totalYearsEstimate = candidateExperiences.length * 1.5; // Heuristic estimate if dates unparsed
    if (totalYearsEstimate >= requiredYears) {
      expScore = 90;
    } else {
      expScore = Math.max(50, Math.round((totalYearsEstimate / Math.max(1, requiredYears)) * 90));
    }
  }

  // 4. Project Evidence Score Calculation
  let projScore = 60;
  const candidateProjects = resume.project || [];
  const strongProjectEvidences = techEvidences.filter(ev => ev.evidenceSource === "project" && ev.evidenceStrength === "Strong");

  if (candidateProjects.length >= 2 || strongProjectEvidences.length >= 1) {
    projScore = 90;
  } else if (candidateProjects.length === 1) {
    projScore = 75;
  }

  // 5. Education & Certification Score Calculation
  let eduScore = 75;
  const candidateEducation = resume.education || [];
  if (candidateEducation.length > 0) {
    const hasDegree = candidateEducation.some(e => e.degree || e.institution);
    if (hasDegree) eduScore = 90;
  }

  // Calculate Overall Weighted Candidate-JD Match Score
  const overallScore = Math.round(
    (weights.wTech * techScore) +
    (weights.wSoft * softScore) +
    (weights.wExp * expScore) +
    (weights.wProj * projScore) +
    (weights.wEdu * eduScore)
  );

  const allEvidences = [...techEvidences, ...softEvidences];
  const matchedSkillsCount = allEvidences.filter(e => e.status === "MATCHED").length;
  const partialSkillsCount = allEvidences.filter(e => e.status === "PARTIAL").length;
  const missingSkillsCount = allEvidences.filter(e => e.status === "MISSING").length;

  return {
    overallScore,
    breakdownScores: {
      technicalScore: techScore,
      softSkillScore: softScore,
      experienceScore: expScore,
      projectScore: projScore,
      educationScore: eduScore,
    },
    weightsUsed: weights,
    skillEvidences: allEvidences,
    matchedSkillsCount,
    partialSkillsCount,
    missingSkillsCount,
  };
};
