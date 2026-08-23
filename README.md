# AI Resume Builder

## Overview

**AI Resume Builder** is a full-stack resume creation and career intelligence platform designed to help candidates craft professional resumes and analyze their alignment against target job descriptions. The system combines interactive resume authoring, AI-assisted content enhancement, structured job description matching, skill canonicalization, evidence extraction, deterministic match scoring, skill gap analysis, relational SQL analytics, and multi-version resume tracking.

Rather than relying on non-deterministic LLM prompts to generate arbitrary match percentages, the platform uses a programmatic scoring engine paired with an isolated relational analytics database. This dual-database design separates operational document storage from analytical queries, ensuring reproducible calculations, auditability, and structured insights into skill demand trends and version progression.

---

## Key Capabilities

### 1. Resume Builder
- Interactive multi-section resume editor supporting personal information, professional summary, technical skills, work experience, projects, and education.
- Multiple visual layout templates (Classic, Modern, Minimal, Minimal Image) with custom accent color picker.
- Profile photo upload with background removal support via ImageKit integration.
- PDF resume import with automated structured data extraction.
- Public URL sharing toggle and print-ready PDF export.

### 2. AI-Assisted Resume Tools
- Professional summary enhancement using active voice and career-focused phrasing.
- Work experience job description polishing focused on action verbs and impact.
- Retrieval-Augmented Generation (RAG) bullet tailoring grounded strictly in the candidate's existing resume corpus.
- Interactive bullet refinement using iterative user feedback.
- RAG evaluation logging tracking retrieval hit-rate, similarity scores, and generation latency.

### 3. Job Description Matching
- Extraction of structured requirements from target job descriptions: technical skills, soft skills, domain tools, experience years, and education levels.
- Immediate side-by-side comparison of candidate experience against target role requirements.
- Automated extraction of explicit job categories (e.g., Business Technology, Data Analytics, Technology Consulting, Software Engineering).

### 4. Skill & Evidence Analysis
- Skill canonicalization dictionary resolving alias variations into standard uppercase entities (e.g., `"Postgres"`, `"PostgreSQL DB"` $\rightarrow$ `"POSTGRESQL"`).
- Narrative regex scanner extracting direct resume evidence lines from work experience and project descriptions.
- Four-tier evidence strength classification: `Strong` (narrative match with metrics or action verbs), `Moderate` (narrative match without metrics), `Weak` (listed in skills array only), and `None` (missing).

### 5. Resume Version Analytics
- Snapshot tracking of resume iterations (v1, v2, v3) to evaluate performance over time.
- Match score progression analysis using SQL window functions (`LAG()`) to compute score improvement deltas across iterations.
- Historical evaluation record persistence linking specific resume versions to target job descriptions.

### 6. SQL Analytics Dashboard
- Interactive executive dashboard rendering key candidate performance metrics.
- Relational SQL analytical widgets displaying skill demand frequency, category skill coverage averages, and ranked skill gap bottlenecks.
- Parameterized SQL execution over an isolated SQLite analytical read-model.

---

## Architecture

```
                       +-------------------------------+
                       |      React 19 Frontend        |
                       |    (Dashboard & Builder UI)   |
                       +---------------+---------------+
                                       |
                                REST API (JWT)
                                       v
                       +-------------------------------+
                       |      Express 5 Server         |
                       +---------------+---------------+
                                       |
         +-----------------------------+-----------------------------+
         |                             |                             |
         v                             v                             v
+------------------+         +-------------------+         +--------------------+
|  Deterministic   |         | Operational DB    |         |  Supporting LLM    |
|  Matching Layer  |         | (MongoDB OLTP)    |         |  (OpenAI API)      |
+--------+---------+         +---------+---------+         +--------------------+
         |                             |
         |                             | Application-Triggered ETL
         |                             v
         |                   +-------------------+
         |                   |  SQLite Analytics |
         |                   |  (OLAP Read Model)|
         |                   +---------+---------+
         |                             |
         |                             v
         |                   +-------------------+
         |                   |   SQL Analytics   |
         |                   |   Query Engine    |
         |                   +---------+---------+
         |                             |
         +-----------------------------+
                                       |
                                       v
                       +-------------------------------+
                       |  Analytics Dashboard Output   |
                       +-------------------------------+
```

### Operational Store (OLTP) vs. Analytical Read-Model (OLAP)

The system architecture cleanly separates operational data management from analytical workloads using two distinct database engines:

- **MongoDB (Operational Store / OLTP):** Owns operational user accounts, flexible nested resume document structures, version snapshots, raw target job descriptions, and user preferences. Document databases excel at accommodating unstructured or semi-structured nested payloads without rigid schema migrations.
- **SQLite (Analytical Read-Model / OLAP):** Serves as an isolated, flattened relational store (`server/data/analytics.sqlite`). Populated via an application-triggered ETL sync pipeline, it allows executing analytical SQL queries, multi-table joins, Common Table Expressions (CTEs), and window functions (`LAG()`, `DENSE_RANK()`) without polluting or locking the primary operational database.

---

## Data Flow

```
Job Description / Candidate Resume
             │
             v
   Skill Normalization Layer
             │
             v
  Evidence Extraction Engine
             │
             v
Deterministic Matching Engine (Score Calculation)
             │
             v
   MongoDB Persistence (OLTP)
             │
             v
Application-Triggered ETL Synchronization
             │
             v
   SQLite Relational Store (OLAP)
             │
             v
     SQL Analytics Engine
             │
             v
 React Analytics Dashboard Output
             │
             v
(Optional) Supporting LLM Explanation Synthesis
```

*Note:* All numerical match scores, skill gap percentages, version deltas, and analytics metrics are calculated **100% deterministically** by Javascript and SQL engines. The LLM client is used exclusively for natural-language advice synthesis and text refinement.

---

## Matching Model

The **Candidate-JD Match Score** is calculated programmatically in Javascript (`server/services/matchingService.js`) using 5 transparent, configurable heuristic weights:

$$\text{Candidate-JD Match Score} = (W_{tech} \times S_{tech}) + (W_{soft} \times S_{soft}) + (W_{exp} \times S_{exp}) + (W_{proj} \times S_{proj}) + (W_{edu} \times S_{edu})$$

### Scoring Dimensions & Default Baseline Weights

- **Technical Skill Coverage ($W_{tech} = 40\%$):** Evaluates ratio of required JD technical skills, tools, and domain skills matched in candidate resume (`Strong` = 1.0pt, `Moderate` = 0.85pt, `Partial/Weak` = 0.50pt).
- **Soft Skill Coverage ($W_{soft} = 15\%$):** Evaluates presence of required soft skills (`Matched` = 1.0pt, `Partial` = 0.5pt).
- **Experience Alignment ($W_{exp} = 20\%$):** Compares total estimated experience years against target JD experience requirements.
- **Project Evidence ($W_{proj} = 15\%$):** Evaluates candidate project descriptions and strong project-level skill evidence.
- **Education & Certifications ($W_{edu} = 10\%$):** Verifies degree level and relevant educational institution details.

### Why Deterministic Scoring?

1. **Reproducibility:** Identical candidate and JD inputs consistently produce the exact same numerical score.
2. **Explainability:** Every point in the overall score traces back to explicit dimensional sub-scores and extracted evidence quotes.
3. **Testability:** Scoring logic can be thoroughly validated using unit tests without external API dependencies or non-deterministic variance.

---

## SQL Analytics

The analytics engine (`server/services/sqlAnalyticsService.js`) runs standard relational SQL queries against the SQLite read-model database to derive business insights:

| Analysis | Business Question Solved | SQL Concepts Used |
| :--- | :--- | :--- |
| **Skill Demand Trends** | Which technical skills appear most frequently across target job descriptions? | `JOIN`, `GROUP BY`, `COUNT()`, `ORDER BY DESC` |
| **Category Coverage** | What is candidate average match score across different job categories? | `JOIN`, `WHERE`, `GROUP BY`, `AVG()`, `ROUND()` |
| **Version Progression** | How has candidate match score improved between consecutive resume versions? | CTE (`WITH ... AS`), `JOIN`, `LAG() OVER (PARTITION BY ... ORDER BY ...)` |
| **Skill Gap Ranking** | Which missing skills pose the largest bottleneck across target applications? | `GROUP BY`, `DENSE_RANK() OVER (ORDER BY ... DESC)` |
| **Executive Metrics** | What are total matches analyzed, average match score, and peak match score? | `COUNT(DISTINCT)`, `AVG()`, `MAX()`, `COALESCE()` |

---

## Database Design

### Operational MongoDB Schemas (OLTP)
- **`users`**: `_id`, `name`, `email`, `password`, `createdAt`
- **`resumes`**: `_id`, `userId`, `title`, `public`, `template`, `accent_color`, `professional_summary`, `personal_info`, `skills[]`, `experience[]`, `project[]`, `education[]`
- **`resume_versions`**: `_id`, `resumeId`, `userId`, `versionNumber`, `versionTitle`, `structuredData`, `createdAt`
- **`job_descriptions`**: `_id`, `userId`, `title`, `company`, `category`, `rawText`, `extractedRequirements`, `createdAt`
- **`match_records`**: `_id`, `resumeId`, `versionId`, `jobId`, `userId`, `overallScore`, `breakdownScores`, `skillEvidences[]`, `createdAt`

### Relational SQLite Schemas (OLAP Read-Model)
- **`dim_users`**: `user_id` (PK), `name`, `email`
- **`dim_job_descriptions`**: `job_id` (PK), `user_id`, `title`, `company`, `category`, `created_at`
- **`dim_skills`**: `skill_id` (PK), `skill_name` (Unique), `category`
- **`bridge_job_skills`**: `job_id`, `skill_id` (Compound PK)
- **`fact_resume_versions`**: `version_id` (PK), `resume_id`, `user_id`, `version_number`, `version_title`, `created_at`
- **`fact_skill_matches`**: `match_id` (PK), `user_id`, `resume_id`, `version_id`, `job_id`, `job_title`, `overall_score`, `technical_score`, `soft_score`, `experience_score`, `project_score`, `education_score`, `created_at`
- **`fact_skill_gaps`**: `gap_id` (PK), `user_id`, `job_id`, `skill_name`, `category`

---

## AI / LLM Boundary

| System Component | Execution Model | Implementation Details |
| :--- | :--- | :--- |
| **Skill Normalization** | Deterministic | Canonical mapping dictionary (`normalizationService.js`) |
| **Evidence Extraction** | Deterministic | Narrative regex pattern matching (`evidenceService.js`) |
| **Candidate-JD Matching** | Deterministic | Programmatic 5-factor weighted formula (`matchingService.js`) |
| **SQL Analytics Queries** | Deterministic | SQLite engine queries (`sqlAnalyticsService.js`) |
| **Executive Advice** | LLM-Assisted | OpenAI API synthesizing text recommendations from calculated metrics |
| **Bullet Refinement** | LLM-Assisted | Contextual LLM polishing based on user feedback |
| **Summary Enhancement** | LLM-Assisted | Action-oriented professional summary generation |

---

## API Overview

### Users (`/api/users`)
- `POST /register` — Register a new user account.
- `POST /login` — Authenticate and issue JWT.
- `GET /data` — Fetch authenticated user profile.
- `GET /resumes` — Fetch user resumes.

### Resumes (`/api/resumes`)
- `POST /create` — Create a new resume.
- `PUT /update` — Update resume content and image.
- `DELETE /delete/:resumeId` — Delete a resume by ID.
- `GET /get/:resumeId` — Retrieve a private resume.
- `GET /public/:resumeId` — Retrieve a public resume.

### AI (`/api/ai`)
- `POST /enhance-pro-sum` — Enhance professional summary.
- `POST /enhance-job-desc` — Enhance job description bullets.
- `POST /upload-resume` — Parse raw PDF resume into structured JSON.
- `POST /tailor-resume` — RAG-based bullet generation grounded in candidate corpus.
- `POST /index-resume` — Index resume bullets into vector store.
- `GET /rag-logs` — Fetch RAG evaluation metrics and logs.
- `POST /refine-bullet` — Refine a bullet point based on user feedback.

### Analytics (`/api/analytics`)
- `POST /jd/parse` — Parse and save target job description.
- `POST /match` — Evaluate Candidate-JD Match Score & extract evidence.
- `POST /versions/create` — Create a resume version snapshot.
- `GET /versions/:resumeId` — Fetch version progression analytics (`LAG()`).
- `GET /dashboard` — Fetch executive dashboard metrics (`DENSE_RANK()`, aggregations).

---

## Project Structure

```
AI Resume Builder/
├── client/                        # React 19 + Vite Frontend
│   ├── src/
│   │   ├── app/                   # Redux store & auth slice
│   │   ├── components/            # UI components (AITools, JDMatchTool, Forms, Navbar)
│   │   ├── configs/               # Axios instance configuration
│   │   ├── pages/                 # Page routes (Dashboard, AnalyticsDashboard, ResumeBuilder, Login)
│   │   ├── App.jsx                # Router configuration (/app/analytics)
│   │   └── main.jsx               # Client entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/                        # Node.js + Express 5 Backend
│   ├── configs/                   # DB, AI, ImageKit, Multer configurations
│   ├── controllers/               # Route controllers (UserController, ResumeController, aiController, analyticsController)
│   ├── data/                      # SQLite OLAP database storage (analytics.sqlite)
│   ├── models/                    # Mongoose schemas (User, Resume, JobDescription, ResumeVersion, MatchRecord, Bullet, RAGEvalLog)
│   ├── routes/                    # API route definitions (UserRoutes, resumeRoutes, aiRoutes, analyticsRoutes)
│   ├── services/                  # Business logic (normalizationService, evidenceService, matchingService, analyticsSyncService, sqlAnalyticsService, explanationService, ragService)
│   ├── scripts/                   # Utility & seed scripts (indexAllResumes.js, seedAnalyticsData.js)
│   ├── tests/                     # Unit and integration test suites (rag.test.js, nextLevelFeatures.test.js, analytics.test.js)
│   ├── server.js                  # Express application entry point
│   └── package.json
│
├── AGENTS.md                      # Canonical source of truth for AI agents
├── README.md                      # Public project documentation
└── package.json                   # Root script runner
```

---

## Running Locally

### Prerequisites
- Node.js >= 20
- MongoDB instance (local or MongoDB Atlas)
- OpenAI API key

### 1. Environment Configuration

Create a `.env` file in `server/`:
```env
PORT=3000
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
IMAGEKIT_PRIVATE_KEY=<your-imagekit-private-key>
```

Create a `.env` file in `client/`:
```env
VITE_BASE_URL=http://localhost:3000
```

### 2. Backend Setup & Seed Command

```bash
cd server
npm install

# Seed SQLite OLAP read-model & MongoDB with synthetic demo data
node scripts/seedAnalyticsData.js

# Start backend server
npm run server
```

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
```

---

## Testing

Backend test suites are implemented using Node.js assertion modules:

```bash
cd server

# Run RAG functionality tests
node tests/rag.test.js

# Run RAG refinement & feedback logic tests
node tests/nextLevelFeatures.test.js

# Run Skill Normalization, Evidence Extraction, Matching, & SQLite SQL tests
node tests/analytics.test.js
```

### Verified Test Results
- `rag.test.js`: All bullet extraction, cosine similarity, and RAG prompt grounding assertions passed.
- `nextLevelFeatures.test.js`: All skill gap sorting, refinement message construction, and feedback boost assertions passed.
- `analytics.test.js`: All skill normalization, evidence strength classification, match scoring, and SQLite window function (`LAG()`, `DENSE_RANK()`) assertions passed cleanly.
- Client Build (`npm run build` in `client/`): Passed (`1889 modules transformed`).

---

## Design Decisions & Trade-offs

1. **MongoDB + SQLite Read Model:** MongoDB accommodates flexible, nested document structures for resumes without schema rigidity. SQLite acts as an isolated relational read-model, allowing analytical SQL queries without overburdening MongoDB.
2. **Deterministic Scoring vs. LLM Scoring:** Programmatic scoring guarantees reproducibility, auditability, zero cost per calculation, and zero risk of numerical hallucination.
3. **Application-Triggered Ingestion ETL:** Synchronous ingestion inside controller request handlers ensures real-time read-model updates upon write actions without introducing distributed infrastructure.
4. **Regex-Based Evidence Extraction:** Heuristic pattern matching provides clean, fast evidence classification without the runtime latency of deep NLP parsing trees.

---

## Known Limitations

1. **Synchronous Ingestion Execution:** Ingestion sync runs synchronously inside Express request handlers; an asynchronous task queue (e.g. BullMQ) would be preferable for high-throughput production environments.
2. **Heuristic Evidence Classifier:** Narrative evidence classification uses regex heuristics; action verb matching (e.g. *"built"*) triggers `Strong` strength regardless of full sentence syntax.
3. **Read-Model Deletion Sync:** Operational MongoDB deletions do not currently issue explicit `DELETE FROM` statements in SQLite; historical match snapshots are preserved in the read-model.

---

## Future Improvements

1. **Asynchronous Ingestion Queue:** Transitioning ETL sync to a background job queue (e.g. BullMQ with Redis).
2. **NLP Evidence Parsing:** Upgrading evidence extraction from regex pattern matching to AST-based verb-noun phrase dependency parsing.
3. **Cascading Delete Sync:** Implementing Mongoose middleware hooks to purge SQLite read-model records upon operational deletion.
4. **API Pagination:** Adding pagination support (`LIMIT` / `OFFSET`) to analytics API endpoints.
5. **Multi-Format Exporting:** Adding structured JSON and XML export options for match evaluation reports.

---

## License

This project is open source and available under the [MIT License](LICENSE).
