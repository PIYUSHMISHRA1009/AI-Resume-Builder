# Qdrant Vector Database Integration

## 1. Why Qdrant?

Qdrant is introduced as the **primary vector database** for RAG/vector-search functionality while keeping MongoDB as the source of truth for application data.

Benefits:
- Dedicated vector search performance
- Cosine similarity optimization
- Payload filtering for multi-tenant isolation
- Cloud-native scalability

## 2. Current Architecture

```
Resume
  ↓
extract bullets / chunking
  ↓
Gemini embedding: gemini-embedding-2
  ↓
3072-dimensional embedding
  ↓
Qdrant PRIMARY (vector storage/search)
  ↓
MongoDB FALLBACK (existing behavior)
  ↓
RAG retrieval
  ↓
Career Intelligence / JD matching / Skill Gap Analysis
```

**MongoDB remains the authoritative database for:**
- users
- resumes
- bullets
- jobs/JDs
- analytics
- RAG evaluation logs
- application data

**Qdrant is ONLY responsible for:**
- vector storage
- vector similarity retrieval

## 3. Qdrant Collection Configuration

| Property | Value |
|----------|-------|
| Collection | `resume_embeddings` |
| Vector Size | 3072 |
| Distance Metric | Cosine |

## 4. Payload Structure

Each Qdrant point contains:

```json
{
  "bulletId": "<MongoDB Bullet _id>",
  "userId": "<user id>",
  "resumeId": "<resume id>",
  "text": "<bullet text>",
  "source": "<source>",
  "embeddingModel": "gemini-embedding-2",
  "embeddingDimension": 3072,
  "metadata": { ... }
}
```

## 5. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `QDRANT_URL` | Qdrant Cloud URL | Required |
| `QDRANT_API_KEY` | Qdrant API key | Required |
| `QDRANT_COLLECTION` | Collection name | `resume_embeddings` |
| `VECTOR_STORE` | Mode: `mongodb`, `qdrant`, `shadow` | `mongodb` |

**Never expose `QDRANT_API_KEY` to the frontend.**

## 6. Migration Procedure

### Prerequisites
1. Set Qdrant environment variables
2. Verify Qdrant connectivity:
   ```bash
   node scripts/testQdrantVector.js
   node scripts/checkQdrantCollection.js
   ```

### Run Migration
```bash
node scripts/migrateVectorsToQdrant.js
```

The migration script:
- Reads existing Bullet documents from MongoDB
- Selects bullets with valid embeddings (`gemini-embedding-2`, 3072 dimensions)
- Uploads existing embeddings to Qdrant
- Does NOT generate new embeddings
- Is idempotent
- Never deletes MongoDB vectors

### Validate Migration
```bash
node scripts/validateQdrantMigration.js
```

## 7. Operating Modes

### `VECTOR_STORE=mongodb` (Default)
- Existing behavior only
- No Qdrant dependency
- Safe default

### `VECTOR_STORE=qdrant` (Primary)
- Qdrant is the primary vector search
- MongoDB is fallback if Qdrant fails
- Dual-write during indexing
- Safe degradation

### `VECTOR_STORE=shadow` (Comparison)
- Both Qdrant and MongoDB are queried
- MongoDB result is authoritative
- Qdrant results are logged for comparison
- Use for validation before switching to primary

## 8. Switching Qdrant to Primary

1. Complete migration:
   ```bash
   node scripts/migrateVectorsToQdrant.js
   ```

2. Validate migration:
   ```bash
   node scripts/validateQdrantMigration.js
   ```

3. Run in shadow mode:
   ```bash
   VECTOR_STORE=shadow npm start
   ```

4. Compare logs for MongoDB vs Qdrant retrieval overlap

5. Switch to primary:
   ```bash
   VECTOR_STORE=qdrant npm start
   ```

## 9. MongoDB Fallback

If Qdrant fails while `VECTOR_STORE=qdrant`:

1. The system automatically falls back to MongoDB retrieval
2. No data is lost
3. Errors are logged server-side
4. The application continues functioning

To restore MongoDB-only mode:
```bash
VECTOR_STORE=mongodb npm start
```

## 10. Rollback Procedure

1. Set `VECTOR_STORE=mongodb` in `.env`
2. Restart the server
3. All vector retrieval uses existing MongoDB logic
4. Qdrant data remains intact for future use

**MongoDB vectors and indexes are never deleted.**

## 11. Dual-Write Indexing

When `indexResumeBullets()` runs:

1. Extract bullets from resume
2. Generate embedding via Gemini
3. Save to MongoDB (source of truth)
4. Upsert to Qdrant (if `VECTOR_STORE != mongodb`)

If Qdrant upsert fails:
- MongoDB bullet is preserved
- Error is logged server-side
- Application continues normally

## 12. Filtered Search

Qdrant payload filters reproduce MongoDB filter behavior:

| Filter | MongoDB | Qdrant |
|--------|---------|--------|
| `userId` | `{ userId: ObjectId }` | `{ key: "userId", match: { value } }` |
| `resumeId` | `{ resumeId: ObjectId }` | `{ key: "resumeId", match: { value } }` |
| `embeddingModel` | `{ embeddingModel: "gemini-embedding-2" }` | `{ key: "embeddingModel", match: { value } }` |

## 13. Data Integrity Guarantees

- MongoDB is never modified by Qdrant operations
- Qdrant points reference MongoDB Bullet IDs in payload
- Migration is read-only from MongoDB perspective
- Rollback to MongoDB-only mode is instant
- No embedding regeneration during migration

## 14. Troubleshooting

### Qdrant connection fails
- Verify `QDRANT_URL` and `QDRANT_API_KEY`
- Check network connectivity
- System falls back to MongoDB automatically

### Migration fails
- Check Qdrant collection exists
- Verify vector dimensions (3072)
- Check API key permissions

### Retrieval differences in shadow mode
- Review overlap metrics in logs
- Verify payload filters match
- Check embedding model consistency
