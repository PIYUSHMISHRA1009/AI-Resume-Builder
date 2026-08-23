# AGENTS.md — Living Source of Truth for AI Coding Agents

## 1. QUICK START

**Project Name:** Career Intelligence & Resume Analytics Platform
**Purpose:** An enterprise-grade, interview-defensible analytics platform that bridges resume customization, job description (JD) intelligence, deterministic skill normalization, evidence-backed candidate-JD match scoring, skill gap analysis, relational SQL analytics, and supporting LLM recommendations.
**Target Persona / Role Alignment:** Business Technology / Data Analytics / Technology Consulting (e.g., ZS Business Technology Solutions Associate — BTSA).

### Primary User Workflow
1. User logs in / registers.
2. User uploads or creates a structured resume (or multiple resume versions).
3. User submits a target Job Description (JD).
4. System parses and extracts structured requirements (Technical Skills, Soft Skills, Experience, Education, Domain Tools).
5. Skill Normalization Layer normalizes resume skills and JD requirements (e.g., "Postgres", "PostgreSQL DB" → "POSTGRESQL").
6. Evidence Extraction Engine searches resume text for supporting context & quantifies evidence strength (Strong, Moderate, Weak, None).
7. Deterministic Matching Engine computes explainable breakdown scores (Technical, Soft Skill, Experience, Education, Project Evidence) with configurable weights to yield the **Candidate-JD Match Score**.
8. Skill Gap Analysis identifies matched, missing, and partially supported skills with clear rationale and learning paths.
9. ETL Sync & Relational SQL Analytics Layer flattens operational MongoDB data into an isolated SQLite OLAP Read-Model database to execute complex analytical queries (Skill Demand Trends, Candidate Coverage %, Match Score Distributions, Resume Version Progression using CTEs & Window Functions).
10. AI / LLM Layer generates natural language explanations, bullet rewrites, and tailored resume advice grounded strictly in calculated analytics and factual resume content.
11. Executive Dashboard presents decision support: "What skills should I learn next?" and "Which resume version performs best?"

### Current Architecture & Stack
- **Frontend:** React 19, Vite, Tailwind CSS v4, Redux Toolkit, Lucide React icons, Axios.
- **Backend:** Node.js (ES Modules), Express 5.
- **Primary Operational Database (OLTP):** MongoDB (Mongoose ORM) — owns operational Users, Resumes, ResumeVersions, JobDescriptions, MatchRecords.
- **Relational Analytics Database (OLAP Read-Model):** SQLite — isolated relational analytics layer populated via idempotent ETL sync from MongoDB for SQL queries, CTEs, and window functions (`LAG()`, `ROW_NUMBER()`, `DENSE_RANK()`).
- **AI / LLM:** OpenAI API (`gpt-4o-mini` or compatible OpenAI-compatible provider) — strictly supporting layer for NLP and text synthesis.
- **Storage & Image:** ImageKit API for profile images and background removal.
- **Authentication:** JWT (JSON Web Tokens) + bcrypt password hashing.

### Key Commands
```bash
# Root directory script commands
npm run server    # Run backend server (from server/)
npm run dev       # Run frontend dev server (from client/)

# Run backend test suites
cd server && node tests/rag.test.js
cd server && node tests/nextLevelFeatures.test.js
cd server && node tests/analytics.test.js

# Seed SQLite OLAP read-model & MongoDB
cd server && node scripts/seedAnalyticsData.js
```

---

## 2. PROJECT VISION

The platform helps candidates evaluate resume-to-job alignment through empirical, explainable data analytics. Rather than acting as a generic "AI Resume Generator" or "LLM wrapper", this system relies on:
- Deterministic parsing & entity extraction.
- Strict skill canonicalization & taxonomy mapping.
- Evidence-based matching with transparent, configurable heuristic weights.
- Relational schema modeling & complex SQL queries (CTEs, Window Functions, Aggregations) via an isolated SQLite OLAP engine.
- LLM as a **supporting intelligence layer** for natural language synthesis, bullet polishing, and contextual guidance.

---

## 3. ARCHITECTURE & DATA FLOW

```
                    +-----------------------------------+
                    |        Client (React 19)          |
                    |    Dashboard / Builder UI         |
                    +-----------------+-----------------+
                                      |
                                 REST API (JWT)
                                      v
                    +-----------------------------------+
                    |        Server (Express 5)         |
                    +-----------------+-----------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
         v                            v                            v
+-------------------+       +-------------------+        +--------------------+
| Structured Data   |       | Deterministic     |        | Supporting AI      |
| & Normalization   |       | Match & Evidence  |        | Layer (OpenAI API) |
+--------+----------+       +---------+---------+        +----------+---------+
         |                            |                             |
         +----------------------------+-----------------------------+
                                      |
                                      v
                    +-----------------------------------+
                    | Primary Operational Database      |
                    | (MongoDB OLTP: Resumes, JDs,      |
                    |  Versions, MatchRecords)          |
                    +-----------------+-----------------+
                                      |
                               ETL Data Sync
                                      v
                    +-----------------------------------+
                    | Relational Analytics Engine       |
                    | (SQLite OLAP Read-Model:          |
                    |  SQL Queries, CTEs, Window Funcs) |
                    +-----------------------------------+
```

---

## 4. DIRECTORY MAP & CREATED COMPONENTS

```
AI Resume Builder/
├── client/                        # Frontend application (React 19 + Vite + Tailwind v4)
│   ├── src/
│   │   ├── app/                   # Redux store and slices (authSlice.js)
│   │   ├── components/            # UI components (AITools, JDMatchTool, Forms, Navbar)
│   │   ├── pages/                 # Route pages (Dashboard, AnalyticsDashboard, ResumeBuilder, Login)
│   │   ├── App.jsx                # Router configuration (/app/analytics)
│   │   └── main.jsx               # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/                        # Backend application (Node.js + Express 5)
│   ├── configs/                   # Database, AI, ImageKit, Multer configurations
│   ├── controllers/               # Route controllers (UserController, ResumeController, aiController, analyticsController)
│   ├── data/                      # Isolated SQLite OLAP store (analytics.sqlite)
│   ├── models/                    # Mongoose schemas (User, Resume, JobDescription, ResumeVersion, MatchRecord, Bullet, RAGEvalLog)
│   ├── routes/                    # API route definitions (UserRoutes, resumeRoutes, aiRoutes, analyticsRoutes)
│   ├── services/                  # Business logic (normalizationService, evidenceService, matchingService, analyticsSyncService, sqlAnalyticsService, explanationService, ragService)
│   ├── scripts/                   # Utility scripts (indexAllResumes.js, seedAnalyticsData.js)
│   ├── tests/                     # Unit and integration test suites (rag.test.js, nextLevelFeatures.test.js, analytics.test.js)
│   ├── server.js                  # Express app entry point
│   └── package.json
│
├── AGENTS.md                      # Mandatory living source of truth for AI agents
├── README.md                      # Public project documentation
└── package.json                   # Root package script runner
```

---

## 5. DATABASE SCHEMA

### Primary Operational Schema (MongoDB)
- **`users`**: `_id`, `name`, `email`, `password`, `createdAt`
- **`resumes`**: `_id`, `userId`, `title`, `public`, `template`, `accent_color`, `professional_summary`, `personal_info`, `skills[]`, `experience[]`, `project[]`, `education[]`
- **`resume_versions`**: `_id`, `resumeId`, `userId`, `versionNumber`, `versionTitle`, `structuredData`, `createdAt`
- **`job_descriptions`**: `_id`, `userId`, `title`, `company`, `category`, `rawText`, `extractedRequirements`, `createdAt`
- **`match_records`**: `_id`, `resumeId`, `versionId`, `jobId`, `userId`, `overallScore`, `breakdownScores`, `skillEvidences`, `createdAt`

### Relational Read-Model Schema (SQLite OLAP Engine)
- **`dim_users`**: `user_id` (PK), `name`, `email`
- **`dim_job_descriptions`**: `job_id` (PK), `user_id`, `title`, `company`, `category`, `created_at`
- **`dim_skills`**: `skill_id` (PK), `skill_name` (Unique), `category`
- **`bridge_job_skills`**: `job_id`, `skill_id` (PK)
- **`fact_resume_versions`**: `version_id` (PK), `resume_id`, `user_id`, `version_number`, `version_title`, `created_at`
- **`fact_skill_matches`**: `match_id` (PK), `user_id`, `resume_id`, `version_id`, `job_id`, `job_title`, `overall_score`, `technical_score`, `soft_score`, `experience_score`, `project_score`, `education_score`, `created_at`
- **`fact_skill_gaps`**: `gap_id` (PK), `user_id`, `job_id`, `skill_name`, `category`

---

## 6. DETERMINISTIC MATCH SCORING & EVIDENCE LAYER

### Candidate-JD Match Score Formula
$$\text{Candidate-JD Match Score} = (W_{tech} \times S_{tech}) + (W_{soft} \times S_{soft}) + (W_{exp} \times S_{exp}) + (W_{proj} \times S_{proj}) + (W_{edu} \times S_{edu})$$

Default Initial Configurable Weights:
- **Technical Skill Coverage ($W_{tech}$):** 40%
- **Soft Skill Coverage ($W_{soft}$):** 15%
- **Experience Alignment ($W_{exp}$):** 20%
- **Project Evidence Alignment ($W_{proj}$):** 15%
- **Education & Certifications ($W_{edu}$):** 10%

### Evidence Extraction Engine
- **Status:** `MATCHED` | `PARTIAL` | `MISSING`
- **Evidence Strength:**
  - `Strong`: Skill found in Experience/Projects WITH quantified metrics or action verbs.
  - `Moderate`: Skill found in Experience/Projects narrative without metrics.
  - `Weak`: Skill listed ONLY in skills array.
  - `None`: Skill missing.

---

## 7. SQL ANALYTICS LAYER

### Executed Analytical Queries
1. **Most Demanded Skills:** Aggregating required skills across all analyzed job descriptions (`GROUP BY skill_id`, `ORDER BY COUNT(*) DESC`).
2. **Candidate Skill Coverage %:** Calculating average scores per role category (`GROUP BY category`).
3. **Resume Version Progression:** Tracking match score changes across resume iterations using SQL Window Functions (`LAG(overall_score) OVER (PARTITION BY job_id ORDER BY version_number)`).
4. **Skill Gap Severity Ranking:** Ranking missing skills by frequency of occurrence across target JDs (`DENSE_RANK() OVER (ORDER BY COUNT(*) DESC)`).

---

## 8. TEST VERIFICATION RESULTS

- `node tests/rag.test.js`: ✅ 100% Passed (extractBullets, cosineSimilarity, buildRAGPrompt).
- `node tests/nextLevelFeatures.test.js`: ✅ 100% Passed (skillGap sorting, refineBullet messages, feedback boost).
- `node tests/analytics.test.js`: ✅ 100% Passed (normalization, evidence extraction, deterministic match scoring, SQL queries with `LAG()` & `DENSE_RANK()`).
- Client Build (`npm run build`): ✅ Passed in 2.94s (1889 modules transformed).

---

## 9. RECOMMENDED RESUME BULLETS (For User's Resume)

1. **Career Intelligence & Resume Analytics Platform (Node.js, Express, React 19, SQLite, MongoDB)**
   - Architected a dual-database analytics platform (MongoDB OLTP + isolated SQLite OLAP read-model) to calculate deterministic Candidate-JD Match Scores across 5 weighted dimensions.
   - Built a skill normalization engine mapping variations (e.g. Postgres → POSTGRESQL) and executed complex SQL analytics using CTEs and window functions (`LAG()`, `DENSE_RANK()`) to track resume version progression.
   - Integrated an evidence extraction engine scanning experience narratives to classify evidence strength (`Strong`, `Moderate`, `Weak`, `None`), paired with a supporting OpenAI LLM layer for natural-language advice.

---

## 10. TOP 15 CONCEPTS TO MASTER BEFORE INTERVIEWS

1. **Dual DB Architecture (OLTP vs OLAP):** Why MongoDB for flexible document storage and SQLite for relational analytical queries.
2. **ETL Sync Pipeline:** How data flows from MongoDB -> SQLite via idempotent upserts (`syncDataToSQLite`).
3. **Skill Normalization & Canonicalization:** Alias resolution using map dictionaries to prevent joining on messy variations like "Postgres" vs "PostgreSQL DB".
4. **Deterministic vs Probabilistic Logic:** Why numerical match scores must be calculated programmatically rather than relying on non-deterministic LLMs.
5. **SQL Window Functions (`LAG`):** Comparing current row values against previous row values partitioned by candidate/job (`LAG(overall_score) OVER (...)`).
6. **SQL Window Functions (`DENSE_RANK`):** Ranking items without skipping rank numbers when ties occur.
7. **Common Table Expressions (CTEs / `WITH`):** Creating readable, modular temporary query blocks for multi-stage window aggregations.
8. **Evidence Extraction & Regex Matching:** Scanning text lines for quantified metrics (`\d+%`, `\$\d+`) and action verbs to quantify evidence strength.
9. **Configurable Heuristic Weights:** Explaining why initial weights (40% Tech, 15% Soft, 20% Exp, 15% Proj, 10% Edu) are heuristic baselines rather than claiming a proprietary ATS secret.
10. **REST API Design & Separation of Concerns:** Decoupling controllers, services, models, and routes in Express 5.
11. **Client-Side Analytics UI (React 19 & Tailwind v4):** Rendering executive dashboard KPI widgets, evidence tables, and progress bars.
12. **JWT Authentication & Middleware:** Securing REST endpoints with token verification.
13. **Error Handling & Offline Fallback:** Graceful fallback when external services (LLM, MongoDB Atlas) are unavailable.
14. **Empirical Software Testing:** Writing pure-logic and database integration assertion tests.
15. **Scope Control & Engineering Pragmatism:** Defending why microservices, Kafka, Redis, or vector DBs were intentionally excluded to maintain a simple, deep, and defensible monolithic architecture.
