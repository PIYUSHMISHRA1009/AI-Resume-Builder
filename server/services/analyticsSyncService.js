import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB file location in server/data/analytics.sqlite
const DB_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_FILE = path.join(DB_DIR, "analytics.sqlite");

let dbPromise = null;

export const getSQLiteDB = async () => {
  if (!dbPromise) {
    dbPromise = open({
      filename: DB_FILE,
      driver: sqlite3.Database,
    }).then(async (db) => {
      await db.exec(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS dim_users (
          user_id TEXT PRIMARY KEY,
          name TEXT,
          email TEXT
        );

        CREATE TABLE IF NOT EXISTS dim_job_descriptions (
          job_id TEXT PRIMARY KEY,
          user_id TEXT,
          title TEXT,
          company TEXT,
          category TEXT,
          created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS dim_skills (
          skill_id INTEGER PRIMARY KEY AUTOINCREMENT,
          skill_name TEXT UNIQUE,
          category TEXT
        );

        CREATE TABLE IF NOT EXISTS bridge_job_skills (
          job_id TEXT,
          skill_id INTEGER,
          PRIMARY KEY (job_id, skill_id)
        );

        CREATE TABLE IF NOT EXISTS fact_resume_versions (
          version_id TEXT PRIMARY KEY,
          resume_id TEXT,
          user_id TEXT,
          version_number INTEGER,
          version_title TEXT,
          created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS fact_skill_matches (
          match_id TEXT PRIMARY KEY,
          user_id TEXT,
          resume_id TEXT,
          version_id TEXT,
          job_id TEXT,
          job_title TEXT,
          overall_score REAL,
          technical_score REAL,
          soft_score REAL,
          experience_score REAL,
          project_score REAL,
          education_score REAL,
          matched_count INTEGER,
          missing_count INTEGER,
          created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS fact_skill_gaps (
          gap_id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          job_id TEXT,
          skill_name TEXT,
          category TEXT
        );
      `);
      return db;
    });
  }
  return dbPromise;
};

/**
 * Sync MongoDB documents to isolated SQLite OLAP database (Idempotent ETL)
 */
export const syncDataToSQLite = async ({ users = [], jds = [], versions = [], matches = [] }) => {
  const db = await getSQLiteDB();

  await db.exec("BEGIN TRANSACTION;");

  try {
    // 1. Sync Users
    for (const user of users) {
      await db.run(
        `INSERT INTO dim_users (user_id, name, email) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET name=excluded.name, email=excluded.email`,
        [user._id.toString(), user.name, user.email]
      );
    }

    // 2. Sync Job Descriptions & Skills
    for (const jd of jds) {
      const jobIdStr = jd._id.toString();
      await db.run(
        `INSERT INTO dim_job_descriptions (job_id, user_id, title, company, category, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(job_id) DO UPDATE SET title=excluded.title, company=excluded.company, category=excluded.category`,
        [
          jobIdStr,
          jd.userId ? jd.userId.toString() : "",
          jd.title || "Untitled Role",
          jd.company || "Target Company",
          jd.category || "Business Technology",
          jd.createdAt ? new Date(jd.createdAt).toISOString() : new Date().toISOString(),
        ]
      );

      const allReqSkills = [
        ...(jd.extractedRequirements?.technicalSkills || []),
        ...(jd.extractedRequirements?.tools || []),
        ...(jd.extractedRequirements?.domainSkills || []),
        ...(jd.extractedRequirements?.softSkills || []),
      ];

      for (const skillName of allReqSkills) {
        if (!skillName) continue;
        const upperSkill = skillName.trim().toUpperCase();

        await db.run(
          `INSERT INTO dim_skills (skill_name, category) VALUES (?, ?)
           ON CONFLICT(skill_name) DO NOTHING`,
          [upperSkill, "Technical"]
        );

        const skillRow = await db.get(`SELECT skill_id FROM dim_skills WHERE skill_name = ?`, [upperSkill]);
        if (skillRow) {
          await db.run(
            `INSERT INTO bridge_job_skills (job_id, skill_id) VALUES (?, ?)
             ON CONFLICT(job_id, skill_id) DO NOTHING`,
            [jobIdStr, skillRow.skill_id]
          );
        }
      }
    }

    // 3. Sync Resume Versions
    for (const ver of versions) {
      await db.run(
        `INSERT INTO fact_resume_versions (version_id, resume_id, user_id, version_number, version_title, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(version_id) DO UPDATE SET version_title=excluded.version_title`,
        [
          ver._id.toString(),
          ver.resumeId.toString(),
          ver.userId.toString(),
          ver.versionNumber,
          ver.versionTitle || `v${ver.versionNumber}`,
          ver.createdAt ? new Date(ver.createdAt).toISOString() : new Date().toISOString(),
        ]
      );
    }

    // 4. Sync Match Records & Skill Gaps
    for (const m of matches) {
      const matchIdStr = m._id.toString();
      await db.run(
        `INSERT INTO fact_skill_matches
         (match_id, user_id, resume_id, version_id, job_id, job_title, overall_score, technical_score, soft_score, experience_score, project_score, education_score, matched_count, missing_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(match_id) DO UPDATE SET overall_score=excluded.overall_score, technical_score=excluded.technical_score`,
        [
          matchIdStr,
          m.userId.toString(),
          m.resumeId.toString(),
          m.versionId ? m.versionId.toString() : null,
          m.jobId.toString(),
          m.jobTitle || "Target Role",
          m.overallScore,
          m.breakdownScores?.technicalScore || 0,
          m.breakdownScores?.softSkillScore || 0,
          m.breakdownScores?.experienceScore || 0,
          m.breakdownScores?.projectScore || 0,
          m.breakdownScores?.educationScore || 0,
          m.matchedSkillsCount || 0,
          m.missingSkillsCount || 0,
          m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
        ]
      );

      // Sync missing skill gaps
      if (Array.isArray(m.skillEvidences)) {
        for (const ev of m.skillEvidences) {
          if (ev.status === "MISSING") {
            await db.run(
              `INSERT INTO fact_skill_gaps (user_id, job_id, skill_name, category)
               VALUES (?, ?, ?, ?)`,
              [m.userId.toString(), m.jobId.toString(), ev.canonicalSkill || ev.skill.toUpperCase(), ev.category || "Technical"]
            );
          }
        }
      }
    }

    await db.exec("COMMIT;");
  } catch (err) {
    await db.exec("ROLLBACK;");
    throw err;
  }
};
