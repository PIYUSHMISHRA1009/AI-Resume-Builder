import { getSQLiteDB } from "./analyticsSyncService.js";

/**
 * Execute SQL Query: Most Demanded Skills Across Target Roles
 */
export const getMostDemandedSkills = async (limit = 10) => {
  const db = await getSQLiteDB();
  const sql = `
    SELECT
      s.skill_name,
      s.category,
      COUNT(j.job_id) AS demand_count
    FROM dim_skills s
    JOIN bridge_job_skills j ON s.skill_id = j.skill_id
    GROUP BY s.skill_id, s.skill_name, s.category
    ORDER BY demand_count DESC
    LIMIT ?;
  `;
  return db.all(sql, [limit]);
};

/**
 * Execute SQL Query: Candidate Skill Coverage % per Job Category
 */
export const getCategorySkillCoverage = async (userId) => {
  const db = await getSQLiteDB();
  const sql = `
    SELECT
      j.category,
      COUNT(m.match_id) AS total_jobs_analyzed,
      ROUND(AVG(m.technical_score), 1) AS avg_tech_coverage,
      ROUND(AVG(m.soft_score), 1) AS avg_soft_coverage,
      ROUND(AVG(m.overall_score), 1) AS avg_overall_match
    FROM dim_job_descriptions j
    JOIN fact_skill_matches m ON j.job_id = m.job_id
    WHERE m.user_id = ?
    GROUP BY j.category;
  `;
  return db.all(sql, [userId]);
};

/**
 * Execute SQL Query: Resume Version Progression Analysis (Window Function LAG)
 */
export const getVersionProgression = async (userId, resumeId) => {
  const db = await getSQLiteDB();
  const sql = `
    WITH VersionMatches AS (
      SELECT
        v.version_number,
        v.version_title,
        m.job_title,
        m.overall_score,
        m.technical_score,
        m.created_at,
        LAG(m.overall_score, 1) OVER (
          PARTITION BY m.job_id ORDER BY v.version_number
        ) AS prev_score
      FROM fact_resume_versions v
      JOIN fact_skill_matches m ON v.version_id = m.version_id
      WHERE v.user_id = ? AND v.resume_id = ?
    )
    SELECT
      version_number,
      version_title,
      job_title,
      overall_score,
      technical_score,
      COALESCE(prev_score, overall_score) AS prev_score,
      ROUND(overall_score - COALESCE(prev_score, overall_score), 1) AS score_improvement,
      created_at
    FROM VersionMatches
    ORDER BY version_number ASC;
  `;
  return db.all(sql, [userId, resumeId]);
};

/**
 * Execute SQL Query: Skill Gap Severity Ranking (Window Function DENSE_RANK)
 */
export const getSkillGapRankings = async (userId, limit = 10) => {
  const db = await getSQLiteDB();
  const sql = `
    SELECT
      g.skill_name,
      g.category,
      COUNT(g.job_id) AS missing_frequency,
      DENSE_RANK() OVER (ORDER BY COUNT(g.job_id) DESC) AS gap_rank
    FROM fact_skill_gaps g
    WHERE g.user_id = ?
    GROUP BY g.skill_name, g.category
    ORDER BY missing_frequency DESC
    LIMIT ?;
  `;
  return db.all(sql, [userId, limit]);
};

/**
 * Fetch Executive Dashboard Overview SQL Metrics
 */
export const getDashboardAnalytics = async (userId) => {
  const db = await getSQLiteDB();

  const overviewSql = `
    SELECT
      COUNT(DISTINCT match_id) AS total_matches_analyzed,
      COALESCE(ROUND(AVG(overall_score), 1), 0) AS avg_match_score,
      COALESCE(ROUND(MAX(overall_score), 1), 0) AS max_match_score,
      COUNT(DISTINCT job_id) AS total_jds_evaluated
    FROM fact_skill_matches
    WHERE user_id = ?;
  `;
  const overview = await db.get(overviewSql, [userId]);

  const topDemandedSkills = await getMostDemandedSkills(8);
  const categoryCoverage = await getCategorySkillCoverage(userId);
  const skillGaps = await getSkillGapRankings(userId, 8);

  return {
    overview: overview || { total_matches_analyzed: 0, avg_match_score: 0, max_match_score: 0, total_jds_evaluated: 0 },
    topDemandedSkills,
    categoryCoverage,
    skillGaps,
  };
};
