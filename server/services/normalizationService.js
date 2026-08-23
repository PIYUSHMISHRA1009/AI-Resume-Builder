/**
 * Skill Normalization Layer
 * Provides canonical skill mapping, alias resolution, and taxonomy classification.
 */

// Dictionary mapping alias strings (in lowercase) to canonical uppercase skill names
const SKILL_ALIAS_MAP = new Map([
  // Database & SQL
  ["postgres", "POSTGRESQL"],
  ["postgresql", "POSTGRESQL"],
  ["postgresql db", "POSTGRESQL"],
  ["postgres db", "POSTGRESQL"],
  ["psql", "POSTGRESQL"],
  ["mysql", "MYSQL"],
  ["my sql", "MYSQL"],
  ["mongodb", "MONGODB"],
  ["mongo db", "MONGODB"],
  ["mongo", "MONGODB"],
  ["sql server", "MS SQL SERVER"],
  ["mssql", "MS SQL SERVER"],
  ["sqlite", "SQLITE"],
  ["sqlite3", "SQLITE"],
  ["oracle", "ORACLE"],
  ["oracle db", "ORACLE"],
  ["redis", "REDIS"],
  ["snowflake", "SNOWFLAKE"],

  // Languages & Analytics Frameworks
  ["python", "PYTHON"],
  ["py", "PYTHON"],
  ["python3", "PYTHON"],
  ["r", "R"],
  ["r programming", "R"],
  ["sql", "SQL"],
  ["structured query language", "SQL"],
  ["javascript", "JAVASCRIPT"],
  ["js", "JAVASCRIPT"],
  ["typescript", "TYPESCRIPT"],
  ["ts", "TYPESCRIPT"],
  ["java", "JAVA"],
  ["c++", "C++"],
  ["cpp", "C++"],

  // BI & Data Visualization
  ["powerbi", "POWER BI"],
  ["power bi", "POWER BI"],
  ["power-bi", "POWER BI"],
  ["tableau", "TABLEAU"],
  ["tableau desktop", "TABLEAU"],
  ["looker", "LOOKER"],
  ["excel", "EXCEL"],
  ["ms excel", "EXCEL"],
  ["advanced excel", "EXCEL"],
  ["google looker studio", "LOOKER"],

  // Data Engineering & Analytics
  ["etl", "ETL"],
  ["extract transform load", "ETL"],
  ["data warehousing", "DATA WAREHOUSING"],
  ["dwh", "DATA WAREHOUSING"],
  ["data pipeline", "DATA PIPELINES"],
  ["data pipelines", "DATA PIPELINES"],
  ["data modeling", "DATA MODELING"],
  ["data analytics", "DATA ANALYTICS"],
  ["data analysis", "DATA ANALYTICS"],
  ["business intelligence", "BUSINESS INTELLIGENCE"],
  ["bi", "BUSINESS INTELLIGENCE"],

  // Machine Learning & AI
  ["machine learning", "MACHINE LEARNING"],
  ["ml", "MACHINE LEARNING"],
  ["machine-learning", "MACHINE LEARNING"],
  ["deep learning", "DEEP LEARNING"],
  ["dl", "DEEP LEARNING"],
  ["nlp", "NLP"],
  ["natural language processing", "NLP"],
  ["llm", "LLM"],
  ["large language models", "LLM"],
  ["scikit-learn", "SCIKIT-LEARN"],
  ["sklearn", "SCIKIT-LEARN"],
  ["pandas", "PANDAS"],
  ["numpy", "NUMPY"],

  // Cloud & DevOps
  ["aws", "AWS"],
  ["amazon web services", "AWS"],
  ["azure", "AZURE"],
  ["microsoft azure", "AZURE"],
  ["gcp", "GCP"],
  ["google cloud", "GCP"],
  ["google cloud platform", "GCP"],
  ["docker", "DOCKER"],
  ["kubernetes", "KUBERNETES"],
  ["k8s", "KUBERNETES"],
  ["git", "GIT"],
  ["github", "GIT"],

  // Consulting & Soft Skills
  ["problem solving", "PROBLEM SOLVING"],
  ["problem-solving", "PROBLEM SOLVING"],
  ["communication", "COMMUNICATION"],
  ["stakeholder management", "STAKEHOLDER MANAGEMENT"],
  ["business requirements", "BUSINESS REQUIREMENTS"],
  ["requirement gathering", "BUSINESS REQUIREMENTS"],
  ["project management", "PROJECT MANAGEMENT"],
  ["agile", "AGILE"],
  ["scrum", "AGILE"],
  ["critical thinking", "CRITICAL THINKING"],
  ["analytical thinking", "CRITICAL THINKING"],
]);

// Skill Category Classification Map
const SKILL_CATEGORY_MAP = new Map([
  ["POSTGRESQL", "Technical"],
  ["MYSQL", "Technical"],
  ["MONGODB", "Technical"],
  ["MS SQL SERVER", "Technical"],
  ["SQLITE", "Technical"],
  ["ORACLE", "Technical"],
  ["SNOWFLAKE", "Technical"],
  ["PYTHON", "Technical"],
  ["R", "Technical"],
  ["SQL", "Technical"],
  ["JAVASCRIPT", "Technical"],
  ["TYPESCRIPT", "Technical"],
  ["JAVA", "Technical"],
  ["C++", "Technical"],

  ["POWER BI", "Tool"],
  ["TABLEAU", "Tool"],
  ["LOOKER", "Tool"],
  ["EXCEL", "Tool"],
  ["AWS", "Tool"],
  ["AZURE", "Tool"],
  ["GCP", "Tool"],
  ["DOCKER", "Tool"],
  ["KUBERNETES", "Tool"],
  ["GIT", "Tool"],

  ["ETL", "Domain"],
  ["DATA WAREHOUSING", "Domain"],
  ["DATA PIPELINES", "Domain"],
  ["DATA MODELING", "Domain"],
  ["DATA ANALYTICS", "Domain"],
  ["BUSINESS INTELLIGENCE", "Domain"],
  ["MACHINE LEARNING", "Domain"],
  ["DEEP LEARNING", "Domain"],
  ["NLP", "Domain"],
  ["LLM", "Domain"],

  ["PROBLEM SOLVING", "Soft Skill"],
  ["COMMUNICATION", "Soft Skill"],
  ["STAKEHOLDER MANAGEMENT", "Soft Skill"],
  ["BUSINESS REQUIREMENTS", "Soft Skill"],
  ["PROJECT MANAGEMENT", "Soft Skill"],
  ["AGILE", "Soft Skill"],
  ["CRITICAL THINKING", "Soft Skill"],
]);

/**
  * Normalize a single raw skill string into its canonical representation.
  * @param {string} rawSkill
  * @returns {string} Canonical skill name (UPPERCASE)
  */
export const normalizeSkill = (rawSkill) => {
  if (!rawSkill || typeof rawSkill !== "string") return "";

  // Clean string: trim, collapse spaces, strip unusual surrounding punctuation
  const cleaned = rawSkill
    .trim()
    .toLowerCase()
    .replace(/[^\w\s\+\#\-\.]/g, "")
    .replace(/\s+/g, " ");

  if (SKILL_ALIAS_MAP.has(cleaned)) {
    return SKILL_ALIAS_MAP.get(cleaned);
  }

  // Fallback: uppercase cleaned string
  return cleaned.toUpperCase();
};

/**
  * Get category for a canonical skill.
  * @param {string} canonicalSkill
  * @returns {"Technical" | "Soft Skill" | "Tool" | "Domain"}
  */
export const getSkillCategory = (canonicalSkill) => {
  if (!canonicalSkill) return "Technical";
  return SKILL_CATEGORY_MAP.get(canonicalSkill) || "Technical";
};

/**
  * Normalize an array of skills, removing duplicates.
  * @param {Array<string>} skills
  * @returns {Array<{ original: string, canonical: string, category: string }>}
  */
export const normalizeSkillList = (skills = []) => {
  if (!Array.isArray(skills)) return [];

  const seen = new Set();
  const result = [];

  skills.forEach(raw => {
    if (!raw || typeof raw !== "string") return;
    const canonical = normalizeSkill(raw);
    if (!canonical || seen.has(canonical)) return;

    seen.add(canonical);
    result.push({
      original: raw.trim(),
      canonical,
      category: getSkillCategory(canonical),
    });
  });

  return result;
};
