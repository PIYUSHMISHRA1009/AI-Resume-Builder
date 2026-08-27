# Technical Audit — Career Intelligence & Resume Analytics Platform

This technical audit evaluates the architecture, data flow, scoring logic, SQL queries, database ingestion, AI boundaries, test coverage, and interview defensibility of the codebase.

---

## 1. Architecture Verdict

The platform implements a clean **Dual-Database Architecture** separating operational document storage from relational analytical reporting:
- **MongoDB (OLTP Operational Store):** Manages user authentication, semi-structured candidate resumes, version snapshots, and target job descriptions.
- **SQLite (OLAP Analytics Read-Model):** Manages flattened relational tables (`dim_users`, `dim_job_descriptions`, `dim_skills`, `bridge_job_skills`, `fact_resume_versions`, `fact_skill_matches`, `fact_skill_gaps`) populated via application-triggered ETL sync (`server/services/analyticsSyncService.js`).
- **Verdict:** Highly defensible for Business Technology / Data Analytics roles. The design clean-cut separates transactional application state from relational analytics.

---

## 2. Data Flow

```
[Candidate / JD Input]
        │
        v
[Express Controller] ──> [Skill Normalization & Evidence Engine]
        │                                 │
        v                                 v
[MongoDB Document Save]      [Deterministic Match Score Calculation]
        │                                 │
        └──────────────┬──────────────────┘
                       │
                       v
         [Application-Triggered ETL Sync]
         (server/services/analyticsSyncService.js)
                       │
                       v
         [SQLite Relational Database]
         (server/data/analytics.sqlite)
                       │
                       v
          [SQL Analytics Engine]
          (CTEs, LAG, DENSE_RANK)
                       │
                       v
        [React 19 Executive Dashboard]
```

---

## 3. Deterministic Matching Audit

- **Implementation File:** `server/services/matchingService.js`
- **Formula:** $\text{Score} = (0.40 \times S_{tech}) + (0.15 \times S_{soft}) + (0.20 \times S_{exp}) + (0.15 \times S_{proj}) + (0.10 \times S_{edu})$
- **Verification:**
  - Weights sum to exactly $1.00$ ($100\%$).
  - Scoring is $100\%$ programmatic and reproducible. Zero LLM calls determine numerical metrics.
  - Returns clean bounded numbers $[0, 100]$ even on empty or malformed inputs.
  - Normalization occurs prior to matching.

---

## 4. SQL Analytics Audit

- **Implementation File:** `server/services/sqlAnalyticsService.js`
- **Executed Queries & Constructs:**
  1. **Most Demanded Skills:** Uses `JOIN`, `GROUP BY`, `COUNT()`, `ORDER BY DESC`.
  2. **Category Skill Coverage %:** Uses `JOIN`, `WHERE`, `GROUP BY`, `AVG()`, `ROUND()`.
  3. **Resume Version Progression:** Uses CTE (`WITH ... AS`), `JOIN`, and Window Function `LAG(overall_score) OVER (PARTITION BY job_id ORDER BY version_number)`.
  4. **Skill Gap Severity Rankings:** Uses `GROUP BY` and Window Function `DENSE_RANK() OVER (ORDER BY COUNT(job_id) DESC)`.
  5. **Executive Overview Metrics:** Uses `COUNT(DISTINCT)`, `AVG()`, `MAX()`, `COALESCE()`.
- **Verification:** All queries use parameterized inputs (`?`), preventing SQL injection. Joins operate on normalized foreign keys.

---

## 5. MongoDB → SQLite Read-Model Audit

- **Implementation File:** `server/services/analyticsSyncService.js`
- **Mechanism:** Application-triggered synchronous ingestion execution inside API handlers (`parseAndSaveJD`, `evaluateMatch`, `createResumeVersion`).
- **Idempotency & Conflict Handling:** SQLite `INSERT INTO ... ON CONFLICT(...) DO UPDATE SET ...` for primary keys (`user_id`, `job_id`, `version_id`, `match_id`) and `ON CONFLICT(skill_name) DO NOTHING` for dimensional skill entities.
- **Transaction Boundaries:** Enclosed inside explicit SQL transactions (`BEGIN TRANSACTION;` ... `COMMIT;` with `ROLLBACK;` on error).

---

## 6. LLM Boundary Audit

- **Implementation Files:** `server/services/explanationService.js`, `server/services/ragService.js`
- **Deterministic Boundary:**
  - Skill canonicalization
  - Evidence strength classification
  - Numerical match score calculation
  - SQL analytics & version deltas
- **LLM-Assisted Boundary:**
  - Executive natural language recommendations
  - Resume bullet polishing with active verbs
  - Professional summary enhancement
- **Verification:** The LLM client is never asked to calculate numerical percentages or rank gaps.

---

## 7. Interview Risk Areas

1. **MongoDB + SQLite Dual Store:**
   - *Risk:* Interviewer asks why SQLite was added alongside MongoDB.
   - *Defense:* MongoDB stores flexible semi-structured document payloads, while SQLite acts as an isolated read-model store for relational SQL queries (`LAG`, `DENSE_RANK`) without overburdening MongoDB.
2. **Synchronous Ingestion Execution:**
   - *Risk:* Ingestion running inside Express HTTP request handlers adds latency.
   - *Defense:* Acknowledge as an application-triggered sync pattern suited for low-to-medium traffic; suggest an async queue (e.g. BullMQ) for enterprise scale.
3. **Regex Evidence Classification:**
   - *Risk:* Regex pattern matching can trigger false-positives (e.g., *"built"* in non-achievement context).
   - *Defense:* Frame as a fast, transparent heuristic baseline, noting AST/dependency parsing as a future improvement.

---

## 8. Features Removed / Simplified

- Removed hardcoded machine links (`file:///Users/...`) from markdown documentation.
- Cleaned interview bait language from `README.md` to present a professional open-source engineering repository.
- Standardized error handling and seed fallback behavior for offline development.

---

## 9. Bugs Fixed

- Fixed line whitespace formatting in `README.md` (`git diff --check` passed cleanly).
- Fixed seed script exception handling so SQLite populates reliably regardless of MongoDB Atlas network state.

---

## 10. Tests Executed

```bash
cd server
node tests/rag.test.js
node tests/nextLevelFeatures.test.js
node tests/analytics.test.js

cd ../client
npm run build
```
- **Backend Tests:** 100% Passed (RAG logic, next-level features, skill normalization, evidence extraction, match calculation, SQLite queries).
- **Client Build:** 100% Passed (1889 modules transformed in 3.19s).

---

## 11. Known Limitations

1. **Deletion Sync:** Deleting a resume in MongoDB does not currently issue an explicit `DELETE FROM` in SQLite (read-model preserves historical match snapshots).
2. **Regex Parsing:** Action verb matching uses regex lookup rather than full dependency tree NLP parsing.

---

## 12. Questions You Must Be Able To Answer (15-20 Technical Questions)

1. **Q: Why use both MongoDB and SQLite in the same Node.js project?**  
   *Answer:* MongoDB handles semi-structured candidate document payloads (OLTP). SQLite operates as an isolated relational read-model (OLAP) to execute analytical queries with window functions without overburdening MongoDB.
2. **Q: Is your ETL pipeline real-time or batch?**  
   *Answer:* It is application-triggered synchronous ingestion occurring immediately after MongoDB write operations.
3. **Q: How do you prevent duplicate skills in your relational schema?**  
   *Answer:* `dim_skills` enforces a `UNIQUE` constraint on `skill_name` combined with `ON CONFLICT(skill_name) DO NOTHING`.
4. **Q: How does `LAG()` work in your version progression query?**  
   *Answer:* It partitions match records by `job_id` and orders them by `version_number`, fetching the `overall_score` of the preceding version row to compute score deltas.
5. **Q: Why use `DENSE_RANK()` instead of `RANK()` for skill gaps?**  
   *Answer:* `DENSE_RANK()` ranks missing skills by occurrence frequency without skipping rank numbers when ties occur.
6. **Q: Why use a CTE in `getVersionProgression`?**  
   *Answer:* The CTE evaluates the `LAG()` window function first, allowing the outer query to compute `overall_score - prev_score` cleanly.
7. **Q: How do you handle variations like "Postgres" vs "PostgreSQL DB"?**  
   *Answer:* A canonical dictionary map (`SKILL_ALIAS_MAP`) in `normalizationService.js` resolves string variants to uppercase canonical tokens (`POSTGRESQL`).
8. **Q: Is your match score calculated by AI?**  
   *Answer:* No. Match scoring is 100% deterministic using rule-based weighted formulas in `matchingService.js`. LLMs are used strictly for natural language advice.
9. **Q: How do you classify evidence strength?**  
   *Answer:* Regular expressions check for numerical metrics (`METRIC_REGEX`) or action verbs (`ACTION_VERB_REGEX`) in narrative lines.
10. **Q: What happens if SQLite ingestion fails?**  
    *Answer:* The transaction rolls back (`ROLLBACK;`) and an error is logged.
11. **Q: Why are technical skills weighted at 40%?**  
    *Answer:* It is a configurable baseline heuristic initial weight tailored for Business Technology roles.
12. **Q: How do you prevent SQL injection in SQLite queries?**  
    *Answer:* All queries use parameterized inputs (`?`) provided by the `sqlite` driver.
13. **Q: How is JWT authentication enforced?**  
    *Answer:* Express middleware `protect` verifies the JWT token header before invoking controllers.
14. **Q: How do you handle unparsed candidate experience years?**  
    *Answer:* Applies a baseline heuristic estimate (1.5 years per experience entry) when explicit date ranges are missing.
15. **Q: What is the primary key of `bridge_job_skills`?**  
    *Answer:* A compound primary key `PRIMARY KEY (job_id, skill_id)`.
16. **Q: Where does the LLM fit into your pipeline?**  
    *Answer:* It receives calculated scores and skill gaps as structured context to generate human-readable recommendations.
17. **Q: What happens if an unknown skill is submitted?**  
    *Answer:* It falls back to stripping special characters and converting the cleaned string to uppercase.
18. **Q: How do you ensure idempotent version indexing?**  
    *Answer:* Deletes previous bullet documents for that resume ID (`deleteMany({ resumeId })`) before inserting new vector embeddings.
19. **Q: Why separate Soft Skills from Technical Skills in scoring?**  
    *Answer:* Allows distinct weighting (40% Tech vs 15% Soft) to reflect technical job requirements accurately.
20. **Q: Can weights be customized per job role?**  
    *Answer:* Yes, `calculateCandidateJDMatch` accepts a `customWeights` override object.

---

### FINAL VERDICT

```
┌───────────────────────────────────────────────────────────┐
│  Architecture            :  9.5 / 10                      │
│  Data / SQL              :  9.5 / 10                      │
│  Backend                 :  9.0 / 10                      │
│  AI Implementation       :  9.0 / 10                      │
│  Frontend                :  9.0 / 10                      │
│  Testing                 :  9.0 / 10                      │
│  Interview Defensibility :  9.5 / 10                      │
│  Overall BTSA Relevance  : 10.0 / 10                      │
└───────────────────────────────────────────────────────────┘
```

#### 3 Strongest Aspects
1. **Dual DB Architecture & Ingestion:** Clear separation between operational document storage (MongoDB) and relational analytics (SQLite).
2. **SQL Analytics Depth:** Meaningful implementation of `LAG()`, `DENSE_RANK()`, `GROUP BY`, and CTEs solving real candidate analytics questions.
3. **Strict LLM Boundaries:** $100\%$ programmatic, reproducible match scoring with zero LLM hallucination risk.

#### 3 Biggest Weaknesses
1. **Synchronous Ingestion:** Ingestion occurs inside HTTP request handlers rather than an async background queue.
2. **Regex Evidence Classification:** Narrative evidence classification uses regex heuristics rather than full dependency tree NLP.
3. **Read-Model Deletion Sync:** Operational MongoDB deletions do not cascade `DELETE` queries to SQLite.

#### 5 Highest-Priority Improvements
1. Add an asynchronous task queue (e.g., BullMQ) for SQLite ingestion sync.
2. Add cascading delete hooks in Mongoose models to purge SQLite read-model records upon entity deletion.
3. Expand unit test assertions to cover custom weight overrides in `matchingService.js`.
4. Integrate dependency tree NLP parsing for action verb-noun phrase evidence resolution.
5. Add pagination support to the SQL analytics API endpoints.
