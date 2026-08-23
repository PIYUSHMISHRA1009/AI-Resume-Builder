# RAG Architecture

## Overview

**Retrieval-Augmented Generation (RAG)** grounds LLM output in user-specific facts
retrieved from a vector store, rather than relying solely on a prompt-only call.

```
Job Description (jd_text)
      │
      ▼  [1] Embed JD
      │      ai.embeddings.create()  (text-embedding-004 / 768 dims)
      │
      ▼  [2] Retrieve top-k bullets
      │      • Atlas $vectorSearch  (preferred — HNSW, filtered by userId)
      │      • In-memory cosine     (fallback — local dev / no Atlas index)
      │
      ▼  [3] Build grounded prompt
      │      System: "Use ONLY retrieved facts. Never invent."
      │      User:   JD + top-k bullets (each tagged with bullet_id)
      │
      ▼  [4] Generate
      │      ai.chat.completions.create() → JSON[{bullet, source_id}]
      │
      ▼  [5] Log eval
             RAGEvalLog: hitRate, scores, latency, generated bullets
```

## Why MongoDB Atlas Vector Search

The existing `MONGODB_URI` should point to your MongoDB Atlas deployment.
Atlas Vector Search is free on M0 clusters — **no new database dependency**
(Chroma / pgvector / Redis not required).

Embeddings are stored as a `[Number]` array on the `Bullet` collection.

### Atlas Index Setup (one-time)

Create a vector search index named `bulletVectorIndex` on the `bullets` collection:

```json
{
  "type": "vector",
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

Via `mongosh`:

```bash
mongosh "<MONGODB_URI>/resume-builder"
# In mongosh:
db.runCommand({
  createIndexes: "bullets",
  indexes: [
    {
      name: "bulletVectorIndex",
      type: "vector",
      definition: {
        fields: [
          { type: "vector", path: "embedding", numDimensions: 768, similarity: "cosine" }
        ]
      }
    }
  ]
});
```

Or via the Atlas UI → **Collections** → `resume-builder` database → `bullets` collection
→ **Indexes** → **Create Index** → **Vector Search**.

> If the index is not configured, the service automatically falls back to in-memory
> cosine similarity (slower, but functional for local development).

## Env Variables

| Variable                       | Default             | Description                                         |
|-------------------------------|---------------------|-----------------------------------------------------|
| `EMBEDDING_MODEL`             | `text-embedding-004` | Embedding model (same Google endpoint as chat)      |
| `EMBEDDING_DIMENSIONS`        | `768`               | Vector dimensions (match your model)                 |
| `RAG_TOP_K`                   | `5`                 | Number of bullets to retrieve per query              |
| `RAG_VECTOR_SEARCH_INDEX`     | `bulletVectorIndex` | Atlas vector search index name (empty = fallback)    |
| `RAG_SIMILARITY_THRESHOLD`    | `0.3`               | Min cosine to count as a retrieval "hit" (eval only) |
| `RAG_LOG_EVAL`                | `true`              | Disable eval logging in production if cost is a concern |

## Corpus: Bullet Extraction

From each `Resume` document, the following text is chunked and indexed:

| Resume field                  | Source label    | Chunking                              |
|-------------------------------|-----------------|---------------------------------------|
| `professional_summary`        | `summary`       | Whole string as one bullet            |
| `skills[]`                    | `skill`         | One bullet per skill string           |
| `experience[].description`    | `experience`    | Split by newlines, trim, filter empty |
| `project[].description`       | `project`       | One bullet per project description    |

Metadata (`company`, `position`, project `name`/`type`) is stored alongside
each bullet for richer retrieval context.

## Auto-Indexing

When a resume is uploaded via `POST /api/ai/upload-resume`, its bullets are
**automatically indexed** into the vector store (non-blocking — a failed index
does not break the upload).

To manually index an existing resume:

```bash
curl -X POST http://localhost:3000/api/ai/index-resume \
  -H "Authorization: <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"resume_id": "<resume_object_id>"}'
```

To backfill all resumes:

```bash
node server/scripts/indexAllResumes.js
```

## API

### `POST /api/ai/tailor-resume`

Ground a resume to a job description using RAG.

**Request:**

```json
{
  "jd_text": "Senior Backend Engineer at a fintech company. Need 5+ years Node.js, AWS, PostgreSQL, and team leadership experience.",
  "resume_id": "64f3a1b2c3d4e5f6..."  // optional — scope to one resume
}
```

**Response:**

```json
{
  "tailoredBullets": [
    {
      "bullet": "Led a 5-person team building scalable Node.js services on AWS...",
      "source_id": "64f3a1b2c3d4e5f67890123456"
    }
  ],
  "retrievedContext": [
    {
      "text": "Led a 5-person team building scalable Node.js services on AWS...",
      "source": "experience",
      "metadata": { "company": "Acme Corp", "position": "Senior Engineer" },
      "score": 0.87
    }
  ],
  "hitRate": 0.8,
  "latencyMs": 412
}
```

Each `source_id` in `tailoredBullets` corresponds to a bullet in
`retrievedContext`, making hallucinations auditable.

### `GET /api/ai/rag-logs?limit=10`

List recent eval logs for manual spot-checking (same auth as other endpoints).

### `POST /api/ai/index-resume`

Manually index bullets from an existing resume.

## Eval Strategy

Every call to `/tailor-resume` (when `RAG_LOG_EVAL !== "false"`) logs:

1. **Hit-rate**: fraction of top-k retrieved bullets whose cosine similarity to the
   JD exceeds `RAG_SIMILARITY_THRESHOLD` (default 0.3).
2. **Grounding audit trail**: the JD (truncated to 500 chars), top-k bullet IDs
   + scores, the raw generated JSON, and `latencyMs`.
3. **Manual spot-check**: `GET /api/ai/rag-logs` returns recent logs so a human
   can verify that each generated bullet's `source_id` traces back to a retrieved
   bullet. A `null` `source_id` or one not in `retrievedContext` flags hallucination.

## Data Models

### Bullet

```js
{
  userId:      ObjectId,   // indexed, used as vectorSearch filter
  resumeId:    ObjectId,   // indexed, optional scope
  text:        String,     // the bullet content
  source:      String,     // "summary" | "skill" | "experience" | "project"
  metadata:    Mixed,      // company, position, etc.
  embedding:   [Number],   // float vector (768-dim for text-embedding-004)
  createdAt:   Date,
  updatedAt:   Date
}
```

### RAGEvalLog

```js
{
  userId:           ObjectId,    // indexed
  jdText:           String,      // truncated to 500 chars
  resumeId:         ObjectId,    // optional
  topK:             Number,
  retrieved: [                   // top-k results with scores
    { bulletId, text, source, score }
  ],
  hitRate:          Number,      // 0–1
  generatedBullets: [            // LLM output
    { bullet, source_id }
  ],
  latencyMs:        Number,
  createdAt:        Date
}
```
