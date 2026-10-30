# Architecture Audit — AI Resume Builder

**Date:** 2026-10-10  
**Branch:** career-intelligence  
**Auditor:** Autonomous QA Agent

---

## 1. Repository Overview

| Aspect | Details |
|--------|---------|
| **Project Type** | Full-stack Career Intelligence & Resume Analytics Platform |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Redux Toolkit, React Router v7 |
| **Backend** | Node.js (ES Modules), Express 5 |
| **Primary DB (OLTP)** | MongoDB with Mongoose ODM |
| **Analytics DB (OLAP)** | SQLite (isolated read-model via ETL sync) |
| **Vector Search** | Qdrant (optional, 3 modes: mongodb/qdrant/shadow) + Atlas Vector Search fallback |
| **AI Provider** | OpenAI-compatible (default: gpt-4o-mini), embeddings via text-embedding-3-large / gemini-embedding-2 |
| **Auth** | JWT (HS256) + bcrypt |
| **File Upload** | Multer (PDF/DOCX), ImageKit for images |
| **PDF Processing** | pdf-parse, mammoth (DOCX) |

---

## 2. Directory Structure (Relevant Paths)

```
AI Resume Builder/
├── client/                          # React 19 + Vite frontend
│   ├── src/
│   │   ├── app/store.js             # Redux store with authSlice
│   │   ├── components/              # UI components (forms, templates, tools)
│   │   ├── configs/api.js           # Axios instance with JWT interceptor
│   │   ├── pages/                   # Route pages (Dashboard, Analytics, Builder, etc.)
│   │   └── App.jsx                  # Router configuration
│   └── package.json
│
├── server/                          # Express 5 backend
│   ├── configs/
│   │   ├── ai.js                    # OpenAI client init
│   │   ├── db.js                    # MongoDB connection with local fallback
│   │   ├── imageKit.js              # ImageKit client
│   │   ├── multer.js / multerDocument.js  # File upload handling
│   ├── controllers/
│   │   ├── UserController.js        # Auth, user profile, resumes list
│   │   ├── ResumeController.js      # CRUD + image upload
│   │   ├── aiController.js          # AI endpoints (summarize, tailor, RAG, gaps)
│   │   ├── analyticsController.js   # JD parse, match, versions, dashboard
│   │   ├── optimizerController.js   # AI optimization recommendations
│   │   └── optimizerUploadController.js  # Document upload for optimizer
│   ├── middlewares/
│   │   └── authMiddleware.js        # JWT verification
│   ├── models/
│   │   ├── User.js                  # name, email, password (bcrypt)
│   │   ├── Resume.js                # Full resume schema
│   │   ├── ResumeVersion.js         # Version snapshots
│   │   ├── JobDescription.js        # Parsed JD with extracted requirements
│   │   ├── MatchRecord.js           # Deterministic match results + evidence
│   │   ├── Bullet.js                # RAG chunks with embeddings
│   │   ├── RAGEvalLog.js            # RAG evaluation logs
│   │   └── RefinementFeedback.js    # User feedback on bullet refinement
│   ├── routes/
│   │   ├── UserRoutes.js            # /api/users
│   │   ├── resumeRoutes.js          # /api/resumes
│   │   ├── aiRoutes.js              # /api/ai
│   │   ├── analyticsRoutes.js       # /api/analytics
│   │   ├── optimizerRoutes.js       # /api/analytics/optimize
│   │   └── optimizerUploadRoutes.js # /api/optimizer/upload-*
│   ├── services/
│   │   ├── normalizationService.js  # Skill canonicalization (alias map)
│   │   ├── evidenceService.js       # Evidence extraction (regex + categorization)
│   │   ├── matchingService.js       # Deterministic Candidate-JD match scoring
│   │   ├── embeddingService.js      # Embeddings + cosine similarity
│   │   ├── ragService.js            # RAG orchestration (index, retrieve, tailor)
│   │   ├── vectorStore/             # Qdrant client (index.js, qdrantStore.js)
│   │   ├── resumeParserService.js   # LLM-based resume text → structured JSON
│   │   ├── analyticsSyncService.js  # ETL: MongoDB → SQLite (idempotent)
│   │   ├── sqlAnalyticsService.js   # SQLite analytical queries (CTEs, window funcs)
│   │   ├── explanationService.js    # LLM natural-language match explanation
│   │   └── optimizerService.js      # LLM optimization recommendations
│   ├── scripts/                     # Utility scripts (seed, index, Qdrant mgmt)
│   ├── tests/                       # Pure-logic unit tests (no DB/AI required)
│   ├── server.js                    # Express app entry point
│   └── package.json
│
├── testing/                         # NEW: Test infrastructure (this directory)
│   ├── fixtures/generated/          # Synthetic resume test data
│   ├── ARCHITECTURE_AUDIT.md        # This file
│   └── TEST_PLAN.md                 # Test execution plan
│
├── docs/                            # Technical documentation
├── AGENTS.md                        # Living source of truth for AI agents
├── TESTING.md                       # Feature testing guide
└── package.json                     # Root scripts (dev, server)
```

---

## 3. Implemented Features (Verified in Source)

### 3.1 Authentication & User Management
- **Register** (`POST /api/users/register`) — bcrypt hash, JWT issuance
- **Login** (`POST /api/users/login`) — bcrypt compare, JWT issuance
- **Get User** (`GET /api/users/data`) — protected, returns user (no password)
- **Get User Resumes** (`GET /api/users/resumes`) — protected, list user's resumes

### 3.2 Resume Management
- **Create** (`POST /api/resumes/create`) — minimal resume with defaults
- **Update** (`PUT /api/resumes/update`) — full replace with optional image upload (ImageKit, bg removal)
- **Delete** (`DELETE /api/resumes/delete/:id`) — ownership validated
- **Get by ID** (`GET /api/resumes/get/:id`) — ownership validated
- **Public Get** (`GET /api/resumes/public/:id`) — public resumes only

**Resume Schema Fields:**
- `title`, `public`, `template` (classic/modern/minimal/minimal-image), `accent_color`
- `professional_summary`, `skills[]`, `personal_info` (image, name, email, phone, location, linkedin, website)
- `experience[]` (company, position, dates, description, is_current)
- `project[]` (name, type, description)
- `education[]` (institution, degree, field, graduation_date, gpa)

### 3.3 AI-Assisted Resume Enhancement
- **Enhance Professional Summary** (`POST /api/ai/enhance-pro-sum`) — LLM rewrite
- **Enhance Job Description** (`POST /api/ai/enhance-job-desc`) — LLM rewrite
- **Upload Resume Text** (`POST /api/ai/upload-resume`) — LLM parse → structured resume + auto-index bullets

### 3.4 RAG Pipeline (Retrieval-Augmented Generation)
- **Index Resume Bullets** (`POST /api/ai/index-resume`) — idempotent re-index, dual-write MongoDB + Qdrant
- **Tailor Resume** (`POST /api/ai/tailor-resume`) — embed JD → retrieve top-k → grounded prompt → generate bullets
- **Refine Bullet** (`POST /api/ai/refine-bullet`) — conversational refinement with feedback persistence
- **Skill Gap Analysis** (`POST /api/ai/skill-gaps`) — vector similarity vs JD, threshold-based gaps + learning resources
- **RAG Eval Logs** (`GET /api/ai/rag-logs`) — spot-check retrieval quality

**Vector Store Modes (via `VECTOR_STORE` env):**
- `mongodb` (default) — Atlas `$vectorSearch` or in-memory cosine fallback
- `qdrant` — Qdrant primary, MongoDB fallback
- `shadow` — both queried, MongoDB authoritative, comparison logged

### 3.5 Job Description Management & Matching
- **Parse & Save JD** (`POST /api/analytics/jd/parse`) — extract requirements, sync to SQLite
- **Evaluate Match** (`POST /api/analytics/match`) — **deterministic** scoring:
  - Normalizes skills (alias map: "Postgres" → "POSTGRESQL")
  - Extracts evidence (Strong/Moderate/Weak/None) from experience, projects, summary, skills list
  - 5-dimension weighted score: Technical (40%), Soft (15%), Experience (20%), Projects (15%), Education (10%)
  - Saves `MatchRecord` to MongoDB, syncs to SQLite OLAP
  - Generates LLM explanation (`explanationService.js`)

### 3.6 Resume Versioning
- **Create Version** (`POST /api/analytics/versions/create`) — snapshot current resume
- **Get Progression** (`GET /api/analytics/versions/:resumeId`) — SQLite window function (`LAG()`) shows score deltas

### 3.7 Analytics Dashboard (SQLite OLAP)
- **Dashboard Metrics** (`GET /api/analytics/dashboard`) — 4 KPIs + 3 SQL widgets:
  1. Most Demanded Skills (`GROUP BY skill_id ORDER BY COUNT(*) DESC`)
  2. Skill Gap Severity Ranking (`DENSE_RANK() OVER (ORDER BY frequency DESC)`)
  3. Resume Version Progression (`LAG(overall_score) OVER (PARTITION BY job_id ORDER BY version_number)`)

### 3.8 Resume Optimizer (Full Pipeline)
- **Upload Resume Document** (`POST /api/optimizer/upload-resume-document`) — PDF/DOCX → text → parse → resume
- **Upload JD Document** (`POST /api/optimizer/upload-jd-document`) — PDF/DOCX/TXT → extract text
- **Analyze** — runs match evaluation
- **Get Recommendations** (`POST /api/analytics/optimize`) — LLM generates up to 5 evidence-based edits
- **Apply & Re-evaluate** — apply recommendations, save resume, re-run match, show before/after

---

## 4. Data Flow Summary

```
User → Frontend (React) → REST API (Express) → MongoDB (OLTP)
                                    ↓
                              ETL Sync (analyticsSyncService)
                                    ↓
                              SQLite (OLAP) ← SQL Analytics (CTEs, Window Functions)
                                    ↑
                            LLM (OpenAI-compatible) — Supporting layer only
```

---

## 5. Existing Test Infrastructure

| Test File | Type | Dependencies | Status |
|-----------|------|--------------|--------|
| `server/tests/rag.test.js` | Pure logic (unit) | None | ✅ Passes |
| `server/tests/nextLevelFeatures.test.js` | Pure logic (unit) | None | ✅ Passes |
| `server/tests/analytics.test.js` | Integration (SQLite) | SQLite file | ✅ Passes |
| `server/services/embeddingService.js` | Self-check | None | ✅ Passes |
| `server/services/ragService.js` | Self-check | None | ✅ Passes |

**Test Runner:** Native Node.js (`node tests/*.test.js`) — no Jest/Vitest configured  
**No frontend tests exist** (no Playwright, Cypress, or React Testing Library)

---

## 6. Environment Configuration

| File | Purpose |
|------|---------|
| `server/.env.example` | Template with all required variables |
| `server/.env` | Actual values (gitignored) |
| `client/.env` | `VITE_BASE_URL` for API |

**Key Server Env Vars:**
- `MONGODB_URI` — Atlas or local (fallback to localhost:27017)
- `JWT_SECRET` — HS256 signing key
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` — AI provider
- `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` — Embeddings
- `VECTOR_STORE` — `mongodb` | `qdrant` | `shadow`
- `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION` — Qdrant config
- `RAG_SIMILARITY_THRESHOLD`, `RAG_TOP_K`, `RAG_LOG_EVAL` — RAG tuning

---

## 7. Identified Gaps & Risks

### 7.1 Testing Gaps
| Area | Gap | Risk |
|------|-----|------|
| **API Integration** | No Supertest/api tests against running Express server | Regressions in request/response contracts undetected |
| **Frontend** | No component, integration, or E2E tests | UI regressions, broken user flows |
| **Database** | No MongoDB Memory Server or test DB isolation | Tests may hit production/local DB |
| **Auth** | No token validation, expiration, middleware tests | Auth bypasses or 401 regressions |
| **File Upload** | No multipart/form-data tests | ImageKit, PDF parsing failures silent |
| **AI Mocking** | No mock provider for LLM/embeddings | Tests require real API keys, incur cost, flaky |
| **Load/Performance** | No load testing infrastructure | Bottlenecks unknown |

### 7.2 Security & Validation Risks
| Issue | Location | Severity |
|-------|----------|----------|
| JWT secret no default validation | `authMiddleware.js` | High if weak secret |
| No input sanitization on resume/JD text | `aiController.js`, `analyticsController.js` | Medium (prompt injection surface) |
| Multer file size limits not explicitly set | `multer.js`, `multerDocument.js` | Medium (DoS via large uploads) |
| CORS allows any localhost port | `server.js:31` | Low (dev only) |
| No rate limiting on AI endpoints | All `/api/ai/*`, `/api/analytics/*` | Medium (cost, abuse) |

### 7.3 Error Handling Weaknesses
| Issue | Location |
|-------|----------|
| Generic 500 on AI provider failures | `aiController.js`, `optimizerController.js` |
| No structured error codes for frontend | All controllers |
| ImageKit upload failure returns 400 but no retry | `ResumeController.js:137-139` |
| SQLite sync errors not surfaced to API response | `analyticsController.js:114-121` |

### 7.4 Architectural Debt
| Issue | Impact |
|-------|--------|
| Dual-write MongoDB + Qdrant without transaction | Potential drift in shadow/qdrant modes |
| Embedding dimension hardcoded in some paths | `embeddingService.js` uses `process.env.EMBEDDING_DIMENSIONS` but Qdrant expects 3072 |
| `VECTOR_STORE` mode changes require restart | Not hot-reloadable |
| No database migration system for SQLite schema | Manual `syncDataToSQLite` only |
| Self-checks in service files run on `import` in tests | Could cause side effects if imported elsewhere |

---

## 8. Current Test Execution Baseline

```bash
# All pass (verified 2026-10-10)
cd server && node tests/rag.test.js                    # 3/3 pass
cd server && node tests/nextLevelFeatures.test.js      # 3/3 pass
cd server && node tests/analytics.test.js              # 4/4 pass
cd server && node services/embeddingService.js         # self-check pass
cd server && node services/ragService.js               # self-check pass

# Build passes
cd client && npm run build                             # 2.94s, 1889 modules
```

---

## 9. Recommended Testing Strategy (Phase B+)

1. **Add Vitest** for unit/integration (compatible with Vite, ESM, Node)
2. **Add Supertest** for Express API tests with isolated test DB
3. **Add MongoDB Memory Server** or dedicated test database
4. **Add MSW (Mock Service Worker)** for AI provider mocking
5. **Add Playwright** for critical E2E flows (login → builder → match → optimize)
6. **Create synthetic data generator** for 1000+ resume fixtures
7. **Add test scripts** to `server/package.json` and `client/package.json`
8. **CI-friendly**: all tests must run without real API keys

---

## 10. Files Modified Since Baseline (Git Status)

| File | Change Type |
|------|-------------|
| `client/src/App.jsx` | Route modifications |
| `client/src/components/JDMatchTool.jsx` | UI tweaks |
| `client/src/components/Navbar.jsx` | Navigation updates |
| `client/src/pages/AnalyticsDashboard.jsx` | Dashboard enhancements |
| `server/configs/db.js` | Connection logic |
| `server/controllers/aiController.js` | AI endpoint changes |
| `server/services/ragService.js` | Qdrant integration, shadow mode |
| `server/server.js` | Route registration |
| `server/package.json` | New dependencies |
| `package.json` / `package-lock.json` | Root script updates |