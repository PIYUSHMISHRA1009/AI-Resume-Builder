# AI Resume Builder

## Overview

**AI Resume Builder** is a full-stack resume creation and career intelligence platform designed to help candidates craft professional resumes and analyze their alignment against target job descriptions. The system combines interactive resume authoring, AI-assisted content enhancement, structured job description matching, skill canonicalization, evidence extraction, deterministic match scoring, skill gap analysis, relational SQL analytics, and multi-version resume tracking.

Rather than relying on non-deterministic LLM prompts to generate arbitrary match percentages, the platform uses a programmatic scoring engine paired with an isolated relational analytics database. This dual-database design separates operational document storage from analytical queries, ensuring reproducible calculations, auditability, and structured insights into skill demand trends and version progression.

## Current implementation status

At commit `8909cca`, the repository contains an Express 5 ES-module API, MongoDB operational models, a SQLite analytics read model, and a React 19/Vite client. Routes exist for authentication, owned resume CRUD, AI text enhancement, resume and job-description uploads, matching, analytics, optimization, and RAG operations. These are implemented routes and UI components, not a claim that every external integration has been exercised live.

The `analyze-jd` endpoint and UI are **not implemented**. Match scores are calculated in server code; the configured OpenAI-compatible provider supplies generated text and explanations. Redis and Qdrant are optional integrations. Current test and live-verification evidence appears below.

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

**Current-status clarification:** The RAG routes and grounding prompts exist, but prompt-injection hardening is unfinished. The wording “grounded strictly” above describes the intended behavior, not a proven security boundary or a claim of live AI verification.

### 3. Job Description Matching
- Extraction of structured requirements from target job descriptions: technical skills, soft skills, domain tools, experience years, and education levels.
- Immediate side-by-side comparison of candidate experience against target role requirements.
- Automated extraction of explicit job categories (e.g., Business Technology, Data Analytics, Technology Consulting, Software Engineering).

**Current-status clarification:** `POST /api/analytics/jd/parse` stores a supplied `category` or defaults it to `Business Technology`; it does not currently run an automated category classifier. There is no `analyze-jd` route or page.

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
- `POST /upload-resume` — Parse supplied resume text into structured JSON.
- `POST /tailor-resume` — RAG-based bullet generation grounded in candidate corpus.
- `POST /index-resume` — Index resume bullets into vector store.
- `GET /rag-logs` — Fetch RAG evaluation metrics and logs.
- `POST /refine-bullet` — Refine a bullet point based on user feedback.

### Optimizer
- `POST /api/analytics/optimize` — Generate recommendations for an owned resume and job description.
- `POST /api/optimizer/upload-resume-document` — Extract and parse an uploaded PDF or DOCX resume.
- `POST /api/optimizer/upload-jd-document` — Extract text from an uploaded PDF, DOCX, or TXT job description.

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

### Current architecture and code map

| Path | Current responsibility |
| --- | --- |
| `client/src/App.jsx`, `client/src/pages/`, `client/src/components/` | React routes, resume forms, analytics and optimizer UI. |
| `client/src/configs/api.js` | Axios API client; attaches the saved JWT to requests. |
| `server/app.js`, `server/server.js` | Express app setup and route mounting; MongoDB connection and port 3000 listener. |
| `server/routes/`, `server/controllers/`, `server/middlewares/` | Authenticated HTTP routes, input handling, ownership checks, and per-user AI rate limiting. |
| `server/models/`, `server/services/analyticsSyncService.js`, `server/services/sqlAnalyticsService.js` | MongoDB records and the SQLite analytics projection/query layer. |
| `server/services/embeddingService.js`, `server/services/ragService.js`, `server/services/vectorStore/` | Embedding requests, retrieval, and optional Qdrant adapter with MongoDB fallback. |
| `server/configs/redis.js`, `server/utils/aiCache.js` | Optional Redis connection and response caching. |
| `testing/unit/server/`, `testing/integration/server/`, `client/src/*.test.*` | Current Vitest tests; older standalone scripts also remain under `server/tests/`. |

**Current-status clarification:** The active default server suite is under `testing/`; the `server/tests/` directory shown above contains older standalone scripts. The LLM client supports the configured `OPENAI_BASE_URL`; it is not limited to one provider. See [AGENTS.md](AGENTS.md) for AI-agent development rules and the fuller repository map.

---

## Running Locally

### Prerequisites
- Node.js >= 20
- MongoDB instance (local or MongoDB Atlas)
- OpenAI API key

**Current-status clarification:** CI and the recorded local checks use Node.js 22. The `>= 20` prerequisite above has not been separately verified across every supported version. An AI provider key is needed for live AI calls, not for the mocked default tests.

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
npm ci

# Seed SQLite OLAP read-model & MongoDB with synthetic demo data
node scripts/seedAnalyticsData.js

# Start backend server
npm run server
```

**Current-status clarification:** `node scripts/seedAnalyticsData.js` writes synthetic demo data and is optional; do not run it when only installing, starting, or checking existing data. The standard server script is `npm start` in `server/` (port `3000` by default). `npm run server` uses nodemon; there is no server `dev` script.

### 3. Frontend Setup

```bash
cd client
npm ci
npm run dev
```

### Exact install, configuration, and run commands

From the repository root, use Node.js 22 and two terminals:

```sh
npm --prefix "server" ci
npm --prefix "client" ci
```

Set server configuration in `server/.env` and the client API origin in `client/.env`. Use your own values locally; commit neither file. The existing examples above contain placeholders, not usable credentials. The variable names are:

| Variable | Purpose |
| --- | --- |
| `PORT`, `CLIENT_URL` | Server listener (`3000` by default) and additional allowed browser origin. |
| `MONGODB_URI`, `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | Operational MongoDB connection and selection timeout; the server has a local MongoDB fallback. The live Qdrant validator requires `MONGODB_URI`. |
| `JWT_SECRET`, `VITE_BASE_URL` | JWT signing secret on the server and the client API base URL. |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `IMAGEKIT_PRIVATE_KEY` | OpenAI-compatible text/embedding provider and optional ImageKit image upload. |
| `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` | Embedding model and vector length; defaults in code are `gemini-embedding-2` and `3072`. |
| `VECTOR_STORE`, `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION` | Retrieval mode and optional Qdrant endpoint, key, and collection. |
| `REDIS_URL`, `AI_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_WINDOW_SECONDS`, `AI_CACHE_TTL_SECONDS` | Optional Redis connection and the limits/cache lifetime described below. |
| `RAG_TOP_K`, `RAG_SIMILARITY_THRESHOLD`, `RAG_LOG_EVAL`, `RAG_VECTOR_SEARCH_INDEX`, `RAG_SKILL_GAP_THRESHOLD` | Retrieval, evaluation, vector-search index, and skill-gap settings. |

```sh
npm --prefix "server" start
```

```sh
npm --prefix "client" run dev
```

The root `npm start` forwards to the server; root `npm run dev` starts only the client. If using an absolute checkout path containing spaces, quote it as one argument, for example `cd "/path/to/AI Resume Builder"`; quote shell glob patterns as well.

---

## Testing

The server test suite uses Vitest. Its default tests mock external services, and the HTTP tests use Supertest:

```bash
cd server

npm test
```

The older MongoMemoryServer suites are opt-in: `npm run test:legacy-integration`.

### Testing and verification recorded at `8909cca`

From the repository root, these commands match the package scripts and CI jobs:

```sh
npm --prefix "server" test
npm --prefix "client" test
npm --prefix "client" run lint
npm --prefix "client" run build
```

At commit `8909cca`, the server suite passed **94/94** tests, the client suite passed **4/4** tests, client lint passed, and the client production build passed. The build reported outdated Browserslist data and a chunk larger than 500 kB. Both package lockfiles also completed `npm ci` in an isolated no-space working copy on macOS Node 22.

The default server suite uses deterministic unit tests and mocked HTTP tests; it does not call live AI, MongoDB, Qdrant, or Redis services. The Qdrant SDK compatibility test uses the installed SDK against mocked HTTP. The four client tests cover the API auth header and login form; they are not broad frontend coverage. The GitHub Actions workflow installs dependencies, runs server tests, then runs client lint, tests, and build. **CI for exact commit `8909cca` has not been verified here.** Live Redis, live AI, browser E2E, and the opt-in legacy MongoMemoryServer suites were **not run**. Root `npm run test:all` adds Playwright E2E tests; it was not part of the reported pass count.

## Qdrant vector store

Qdrant is optional. Configure these server environment variables:

- `VECTOR_STORE`: `mongodb` (default), `qdrant`, or `shadow`.
- `QDRANT_URL`: Qdrant service endpoint.
- `QDRANT_API_KEY`: Qdrant authentication key.
- `QDRANT_COLLECTION`: collection name; defaults to `resume_embeddings`.
- `EMBEDDING_MODEL`: embedding model name. The application default is `gemini-embedding-2`; `.env.example` selects `text-embedding-3-large`.
- `EMBEDDING_DIMENSIONS`: vector size used for collection setup and migration filtering; defaults to `3072`.

`mongodb` does not use Qdrant and needs no Qdrant credentials. `qdrant` uses Qdrant for retrieval and falls back to MongoDB when Qdrant is unavailable, misconfigured, or returns an error. `shadow` returns MongoDB results and compares Qdrant results; Qdrant failures leave MongoDB authoritative. Unknown modes, an invalid `QDRANT_URL`, or missing `QDRANT_URL` or `QDRANT_API_KEY` produce a warning and use MongoDB.

The default collection uses cosine distance. Its vector size follows `EMBEDDING_DIMENSIONS` (default `3072`). Bootstrap creates keyword payload indexes for `userId`, `resumeId`, `embeddingModel`, and `bulletId`; a mismatched existing vector size or distance prevents Qdrant retrieval and does not delete or recreate the collection. Every Qdrant search and delete is scoped by `userId`.

Run the read-only health check from `server/`:

```bash
npm run qdrant:check
```

It reports whether configuration values are present, Qdrant reachability and authentication, collection settings, the `userId` index, and point counts. It never prints the Qdrant URL or key. MongoDB bullet counts are included when MongoDB is reachable.

The backfill is batch-limited and resumable. Its dry run counts eligible MongoDB bullets without initializing Qdrant or writing data:

```bash
npm run qdrant:migrate -- --dry-run
```

For an explicitly authorized real backfill, `--batch-size`, `--limit`, `--after-id`, and `--checkpoint` control batching and resumption. The script upserts stable point IDs and never deletes from MongoDB or Qdrant. Do not run it against production data without approval.

Qdrant tests mock the client with `vi.mock`; they do not use live Qdrant, MongoDB, or embedding services. If a Qdrant key is exposed, rotate it in the Qdrant console, update `server/.env` locally and the host's environment variables, and never commit the key.

**Current-status clarification:** Most Qdrant tests mock the client, but `testing/unit/server/qdrant-sdk-api.test.ts` exercises installed `@qdrant/js-client-rest` 1.19.0 with mocked HTTP. The adapter calls `query()` (the installed SDK has no `search()` method) and maps `result.points` to `{ bulletId, text, source, metadata, score }`. Every search requires `userId`; deletes filter by `userId` and bullet IDs. `shadow` mode returns MongoDB results while comparing Qdrant, and `qdrant` mode falls back to MongoDB on retrieval errors.

### Current Qdrant configuration, migration, and read-only validation

The embedding model and vector dimensions must match the stored MongoDB bullets and Qdrant collection. Code defaults are `EMBEDDING_MODEL=gemini-embedding-2` and `EMBEDDING_DIMENSIONS=3072`; changing either setting does not convert existing vectors. The collection uses cosine distance. A collection dimension or distance mismatch blocks Qdrant retrieval and leaves MongoDB as fallback. `QDRANT_COLLECTION` defaults to `resume_embeddings`; `mongodb` is the default `VECTOR_STORE` mode and needs no Qdrant credentials.

The reported existing backfill is **complete**: 98 processed, 0 failed, and 0 remaining eligible. Do **not** rerun it for validation, regenerate embeddings, delete points, or recreate the collection. A real backfill writes to Qdrant and can incur service costs. This script copies existing embeddings; a separate regeneration step, if ever needed, may incur embedding-provider charges.

For read-only checks, from the repository root run:

```sh
(cd "server" && npm run qdrant:check)
(cd "server" && node scripts/validateQdrantMigration.js)
```

The validator requires configured MongoDB and Qdrant access. It compares eligible MongoDB vectors with Qdrant points, checks five sampled points using each record's `userId` and `bulletId`, and reports user-filtered retrieval overlap; it does not bootstrap the collection or write points. The last reported **live read-only** result at `8909cca` was **98/98** counts, **5/5** sampled points, and **5/5** filtered overlap. These live results are separate from the mocked test suite. If planning a future migration, `cd "server" && npm run qdrant:migrate -- --dry-run` counts eligible bullets without writing or generating embeddings; a real backfill requires a separate, explicit decision.

## Redis (optional)

Redis provides per-user rate limiting for AI routes and response caching for professional-summary and job-description text enhancement. Redis is off unless `REDIS_URL` is set. Rate limiting and caching fail open if Redis is unavailable, so requests continue without Redis. Start a local Redis instance with:

```bash
docker run -p 6379:6379 redis:7
```

Then set `REDIS_URL=redis://127.0.0.1:6379` in `server/.env`. Resume uploads and parsing are rate limited but are not cached.

### Current Redis rate-limit and cache behavior

After authentication, every `/api/ai/*` route, `POST /api/analytics/optimize`, and both `/api/optimizer/*` upload routes use a per-user fixed-window limiter. Defaults are **20 requests per 3600 seconds** (`AI_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_WINDOW_SECONDS`). Responses set `X-RateLimit-Limit` and `X-RateLimit-Remaining`; a request above the limit receives HTTP **429** and `Retry-After` based on the Redis key TTL. If `REDIS_URL` is unset, Redis connection fails, or a Redis command times out/fails, limiting fails open so the request continues. Failure logs contain metadata, not request content.

Only `POST /api/ai/enhance-pro-sum` and `POST /api/ai/enhance-job-desc` cache successful computed text responses. The cache key is a SHA-256 digest of endpoint, user ID, and normalized input; default TTL is **86400 seconds** (`AI_CACHE_TTL_SECONDS`). These responses set `X-Cache: HIT`, `MISS`, or `BYPASS`. Other uploads, parsing, optimization, RAG, and database-writing routes are not response cached. On a Redis cache failure, the handler computes the response and reports `BYPASS`. Tests exercise these paths with mocked Redis; live Redis `MISS`/`HIT`/`BYPASS` behavior remains unverified. No hosted Redis deployment is established by this README.

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

### Current known limitations and remaining work

- The `analyze-jd` endpoint and UI are unfinished. Do not treat the existing JD parse/match routes as that feature.
- Prompt-injection hardening for resume and job-description text is incomplete. JWTs are stored in client `localStorage`; document upload checks use reported MIME types rather than file signatures.
- The tested client surface is limited to auth headers and login form behavior. Browser E2E, legacy MongoMemoryServer suites, live AI, and live Redis were not run for the recorded verification; CI for the exact commit is unverified here.
- The last `npm ci` audit summaries reported **15 server** and **31 client** dependency advisories on 2026-10-30. No dependency changes or audit fixes are part of this documentation update.
- Next steps include validating live Redis behavior with safe fixtures, broadening client navigation/form tests, reviewing dependency advisories, and hardening file and prompt input handling. The recorded checks do not establish production readiness.

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

**Current-status clarification:** No tracked `LICENSE` file was found at the root during this README update, so the existing link above is unresolved. Confirm and add the intended license file separately before relying on that statement.
