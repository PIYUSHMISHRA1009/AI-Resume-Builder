# 🧪 Testing Guide — RAG Resume Tailoring & Next-Level Features

This guide covers how to test the features integrated in the **last 2–3 days**:

| Feature | Endpoint / Entry point | Status |
|---------|------------------------|--------|
| RAG resume tailoring (grounded bullet generation) | `POST /api/ai/tailor-resume` | ✅ live |
| Manual bullet indexing | `POST /api/ai/index-resume` | ✅ live |
| Auto-indexing on resume upload | `POST /api/ai/upload-resume` (side-effect) | ✅ live |
| RAG eval log spot-check | `GET /api/ai/rag-logs` | ✅ live |
| Interactive bullet refinement (feedback loop) | `POST /api/ai/refine-bullet` | ✅ live |
| Skill-gap analysis + learning resources | `POST /api/ai/skill-gaps` | ✅ live |
| Backfill script (index all existing resumes) | `node server/scripts/indexAllResumes.js` | ✅ |
| Unit tests | `server/tests/*.test.js` | ✅ |
| Inline self-checks | `server/services/*.js` (run directly) | ✅ |

> Architecture, env variables, and Atlas index setup live in
> [`server/docs/rag.md`](server/docs/rag.md). This guide is purely about
> **how to verify the features work**.

---

## 0. Prerequisites

- Node.js ≥ 20
- `server/.env` with at least: `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY`,
  `OPENAI_BASE_URL`, `OPENAI_MODEL` (see `README.md` → Getting Started)
- MongoDB reachable (local **or** Atlas). Atlas is preferred for
  `$vectorSearch`; without it the service automatically falls back to in-memory
  cosine similarity (see troubleshooting).
- Optional (recommended for prod-like behavior): the `bulletVectorIndex` Atlas
  Vector Search index — see `server/docs/rag.md` → "Atlas Index Setup".

---

## 1. Fast automated checks (no DB / no AI required)

These are pure-logic tests that don't touch the database or the AI API, so they
run in seconds on any machine.

```bash
cd server

# RAG unit tests: bullet extraction, cosine similarity, prompt grounding
node tests/rag.test.js

# Next-level feature logic: skill-gap filtering/sorting, refine-bullet message
# construction, retrieval feedback boost
node tests/nextLevelFeatures.test.js
```

Both print `✓ ... passed` per group. A failed group exits with code `1`.

### Inline self-checks

The services carry a tiny self-test that runs when the file is executed
directly — a quick smoke check that the module loads and its core logic is sane:

```bash
cd server

node services/embeddingService.js    # cosine similarity + chunkExperience
node services/ragService.js          # buildRAGPrompt grounding constraint
```

Expected: `✓ embeddingService self-check passed` / `✓ ragService.buildRAGPrompt self-check passed`.

> There is no `npm test` script — these files are run directly with `node`.
> Optionally add one to `server/package.json`:
> `"test": "node tests/rag.test.js && node tests/nextLevelFeatures.test.js"`.

---

## 2. Backfill script (index existing resumes)

Auto-indexing only fires for resumes uploaded **after** the feature landed. To
index resumes that already exist in the DB:

```bash
cd server
node scripts/indexAllResumes.js
```

Expected output per resume:
`✓ Resume "<title>" → N bullets [summary, skill, experience, project]`

and a final summary: `Done: N bullets indexed across X/Y resumes.`

Verify the result in the DB:

```bash
mongosh "<MONGODB_URI>/resume-builder" --eval \
  'db.bullets.countDocuments({})'
```

(should be > 0), and inspect a sample:

```bash
mongosh "<MONGODB_URI>/resume-builder" --eval \
  'db.bullets.aggregate([{$project: {text: 1, source: 1, embeddingLength: {$size: "$embedding"}}}]).toArray()'
```

A non-empty `embedding` array (768 dims for `text-embedding-004`) confirms
embeddings were created.

---

## 3. End-to-end API testing (requires server + DB + AI keys)

### 3.0 Start the server

```bash
cd server
npm run server        # nodemon on http://localhost:3000
```

### 3.1 Get a JWT

Every RAG endpoint is behind `protect`. Grab a token from register or login:

```bash
# Register (first time)
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Tester", "email": "tester@example.com", "password": "secret123"}'

# Login (subsequent runs)
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tester@example.com", "password": "secret123"}'
```

Copy the `token` from the JSON response and export it:

```bash
export TOKEN="<paste_token_here>"
```

> Note: the auth middleware expects the raw token in the `Authorization`
> header — **no `Bearer ` prefix**.

### 3.2 Upload a resume (exercises auto-indexing)

```bash
curl -X POST http://localhost:3000/api/ai/upload-resume \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Resume",
    "resumeText": "Piyush Kumar\nSenior Backend Engineer\n\nPROFESSIONAL SUMMARY\nSenior backend engineer with 5+ years building Node.js APIs on AWS.\n\nSKILLS\nNode.js, React, MongoDB, AWS, Docker\n\nEXPERIENCE\nAcme Corp — Senior Engineer (2021–Present)\nLed a team of 5 engineers building scalable APIs\nReduced cloud costs by 40% via AWS optimization\nBuilt CI/CD pipelines with GitHub Actions\n\nPROJECTS\nAPI Gateway — Production\nBuilt an API gateway handling 10k requests/day"
  }'
```

**Expected:**
- `200` with the created resume document, **and**
- the server log line: `RAG indexing failed (non-blocking): ...` should **NOT**
  appear (if it does, indexing failed — see troubleshooting).

Copy the returned `_id` — it's your `resume_id`.

### 3.3 Manually re-index a resume (idempotency check)

```bash
curl -X POST http://localhost:3000/api/ai/index-resume \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resume_id": "<resume_id>"}'
```

**Expected:** `201` with `count` (number of bullets) and `sources`
(`["summary", "skill", "experience", "project"]`). Running it twice should give
the same `count` (old bullets for the resume are deleted first — re-index is
idempotent).

### 3.4 Tailor a resume to a job description (the core RAG flow)

```bash
curl -X POST http://localhost:3000/api/ai/tailor-resume \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jd_text": "Senior Backend Engineer — 5+ years Node.js, AWS, PostgreSQL, team leadership.",
    "resume_id": "<resume_id>"
  }'
```

**Expected:** `200` with four fields:

```json
{
  "tailoredBullets":   [{ "bullet": "...", "source_id": "..." }],
  "retrievedContext":  [{ "text": "...", "source": "experience", "metadata": {...}, "score": 0.87 }],
  "hitRate":           0.8,
  "latencyMs":         412
}
```

**Acceptance checks (the important part):**
1. `tailoredBullets` is a non-empty JSON array.
2. Every `source_id` in `tailoredBullets` matches a `bulletId` in
   `retrievedContext` → proves the output is grounded, not hallucinated.
3. Bullets mention only facts that exist in the corpus (Node.js, AWS, team of 5,
   cost reduction) and no invented metrics.
4. `retrievedContext` items are ordered by `score` descending.

### 3.5 Spot-check RAG eval logs

```bash
curl -X GET "http://localhost:3000/api/ai/rag-logs?limit=5" \
  -H "Authorization: $TOKEN"
```

**Expected:** `200` with the most recent `RAGEvalLog` docs (each includes the
truncated JD, top-k retrieved bullets + scores, `hitRate`, `latencyMs`, and the
generated bullets). After the step 3.4 call there should be at least one log.

### 3.6 Refine a bullet interactively (feedback loop)

Take a `bulletId` from `retrievedContext` (or a bullet `_id` from the DB):

```bash
curl -X POST http://localhost:3000/api/ai/refine-bullet \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bulletId": "<bulletId>",
    "userFeedback": "Make it more concise and emphasize the AWS part",
    "conversationHistory": ["User: Can you make this more impactful?", "Assistant: Sure, how about emphasizing AWS?"]
  }'
```

**Expected:** `200` with `{ "refinedText": "...", "bulletId": "..." }`.

**Acceptance checks:**
1. `refinedText` reflects the feedback (more concise, AWS emphasized) but does
   **not** introduce new facts.
2. A `RefinementFeedback` row was saved:
   ```bash
   mongosh "<MONGODB_URI>/resume-builder" --eval \
     'db.refinementfeedbacks.countDocuments({})'
   ```
3. **Feedback boost effect (optional):** run `tailor-resume` again. The refined
   bullet's retrieval score gets `+0.1` (capped at 1.0), so it may rank higher
   in `retrievedContext`.

### 3.7 Skill-gap analysis

```bash
curl -X POST http://localhost:3000/api/ai/skill-gaps \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jdText": "Senior Backend Engineer — Node.js, AWS, PostgreSQL, Python, Kubernetes", "threshold": 0.4}'
```

**Expected:** `200` with `skillGaps` — skills from your corpus whose similarity
to the JD is below `threshold`, sorted by similarity ascending (biggest gaps
first), each with a `suggestion` and a `learningResource` URL.

**Acceptance checks:**
1. Skills present in both JD and corpus (e.g., Node.js) are **absent** from
   `skillGaps`.
2. Skills in your corpus but weaker/absent in the JD (e.g., Python if you only
   listed Node.js) appear as gaps.
3. `learningResource` is a URL for known skills, or a fallback sentence
   otherwise.

---

## 4. Verification checklist (TL;DR)

- [ ] `node tests/rag.test.js` → all `✓`
- [ ] `node tests/nextLevelFeatures.test.js` → all `✓`
- [ ] `node services/embeddingService.js` + `node services/ragService.js` → `✓`
- [ ] `node scripts/indexAllResumes.js` → bullets indexed, `db.bullets` populated
- [ ] `upload-resume` → 200 + no "RAG indexing failed" in server logs
- [ ] `index-resume` → 201, same `count` on re-run
- [ ] `tailor-resume` → every `source_id` traceable to `retrievedContext`
- [ ] `rag-logs` → logs exist after a tailor call
- [ ] `refine-bullet` → refined text honors feedback, `refinementfeedbacks` row saved
- [ ] `skill-gaps` → matching skills excluded, missing skills listed with resources

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Server log: `RAG indexing failed (non-blocking): Resume not found` | `userId` mismatch / bad `resume_id` | Resume must belong to the logged-in user |
| `tailor-resume` returns 500 `... first argument must be of type string...` | `EMBEDDING_MODEL` / API key misconfigured | Check `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `EMBEDDING_MODEL` |
| Slow retrieval / all searches scan everything | No Atlas vector index → in-memory fallback active | Create `bulletVectorIndex` (see `server/docs/rag.md`) |
| `$vectorSearch` errors silently falling back | Index name/path mismatch | Index must be named `bulletVectorIndex` (or set `RAG_VECTOR_SEARCH_INDEX`) with `path: "embedding"`, `numDimensions: 768`, `similarity: "cosine"` |
| `hitRate` always 0 | JD topics too far from corpus, or low `RAG_SIMILARITY_THRESHOLD` | Add resumes matching the JD; lower `RAG_SIMILARITY_THRESHOLD` (eval-only) |
| `tailoredBullets` has `source_id: null` | Model returned non-JSON (flagged as ungrounded) | Re-run; check `rag-logs` for the raw output |
| `rag-logs` empty | `RAG_LOG_EVAL=false` or no tailor calls yet | Ensure `RAG_LOG_EVAL` is not `"false"`; call `tailor-resume` once |
| `401 Unauthorized` | Token missing/expired/`Bearer` prefix sent | Header must be exactly `Authorization: <token>` (no prefix) |

---

## 6. What NOT to test by hand

- The AI quality itself (wording, tone) — spot-check a handful of
  `rag-logs` entries instead of every call.
- Atlas `$vectorSearch` latency in local dev — the in-memory fallback is fine
  for functional testing; latency checks belong on Atlas.
