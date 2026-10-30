# 🧪 Testing Infrastructure — AI Resume Builder

This document provides a comprehensive overview of the automated testing infrastructure for the AI Resume Builder, including the synthetic dataset generator, test suites, and execution procedures.

---

## Overview

The testing infrastructure is organized in the `testing/` directory and consists of:

| Component | Purpose |
|-----------|---------|
| **Synthetic Data Generator** | Creates 1,000+ deterministic, schema-compliant resume fixtures |
| **Unit Tests** | Pure-logic tests for normalization, evidence, matching, embeddings, RAG prompts |
| **Integration Tests** | API + database tests using MongoDB Memory Server (isolated, no external deps) |
| **Schema Compatibility Tests** | Validates all 1,000 generated resumes against actual Mongoose schema |
| **CRUD Integration Tests** | Full create/read/update/delete cycles with generated dataset |
| **Auth Integration Tests** | Registration, login, token validation, protected endpoints |
| **Original Baseline Tests** | Pre-existing pure-logic tests (rag, nextLevelFeatures, analytics) |

---

## Quick Start

### Run All Tests

```bash
# Server tests (Vitest)
cd server && npx vitest run

# Original baseline tests (Node)
cd server && node tests/rag.test.js && node tests/nextLevelFeatures.test.js && node tests/analytics.test.js

# Client build
cd client && npm run build
```

### Generate Synthetic Dataset

```bash
npx tsx testing/data-generators/cli.ts
```

Outputs:
- `testing/fixtures/generated/resumes-42.json` — 1,000 valid resumes
- `testing/fixtures/generated/invalid-resumes.json` — 10 invalid test cases
- `testing/fixtures/generated/index.json` — Distribution metadata

---

## Test Suites Summary

### Phase C: Synthetic Data Generator (43 tests)

| Test Suite | Tests | Status |
|------------|-------|--------|
| Record Count | 2 | ✅ |
| Deterministic Generation | 3 | ✅ |
| Schema Compatibility | 12 | ✅ |
| Uniqueness | 3 | ✅ |
| Meaningful Diversity | 10 | ✅ |
| Invalid Test Cases | 3 | ✅ |
| Edge Cases | 6 | ✅ |
| Data Summary Statistics | 2 | ✅ |
| Configuration Validation | 4 | ✅ |
| **Total** | **43** | **✅ ALL PASS** |

### Phase D1.A: Schema Compatibility (14 tests)

| Test | Description |
|------|-------------|
| 1000 resumes schema validation | `doc.validateSync()` on all records |
| Required fields presence | All 10 schema fields present |
| Personal info structure | 8 fields, email format, test domains |
| Experience structure | 6 fields, date format validation |
| Project structure | 3 fields, all strings |
| Education structure | 5 fields, date format validation |
| Template values | Must be classic/modern/minimal/minimal-image |
| Accent color format | Must match #RRGGBB |
| Public field | Boolean |
| Skills array | Array of non-empty strings |
| Invalid cases distinct reasons | 10 unique failure types |
| Invalid cases validation | Expected failures for invalid-email, malformed-dates, negative-experience |

**Result:** 1,000/1,000 valid resumes pass schema validation. Zero errors. 600 warnings for intentionally empty optional fields (skills, experience, summary).

### Phase D1.B: CRUD Integration (25 tests)

| Category | Tests | Coverage |
|----------|-------|----------|
| CREATE | 3 | Full dataset create, minimal create, auth required |
| READ | 5 | By ID, 404 not found, cross-user 404, public access, private 404 |
| UPDATE | 4 | Fields, nested objects, non-existent (returns null), auth required |
| DELETE | 3 | Owner delete, cross-user blocked, auth required |
| EDGE CASES | 5 | Empty arrays, no summary, no education, minimal, malformed ObjectId |
| VARIED PROFILES | 1 | Full CRUD cycle × 5 professions |
| BULK (100) | 2 | Create 20/100, verify all persist |
| **FULL DATASET (1000)** | **1** | **Create 1000 + Read 1000 round-trip (~3.1s)** |
| **Total** | **25** | **✅ ALL PASS** |

### Unit Tests (61 tests)

| File | Tests | Area |
|------|-------|------|
| normalization.test.ts | 18 | Skill canonicalization (Postgres → POSTGRESQL) |
| evidence.test.ts | 11 | Evidence extraction (Strong/Moderate/Weak/None) |
| matching.test.ts | 11 | Deterministic 5-dimension match scoring |
| embedding.test.ts | 15 | Cosine similarity, vector operations |
| rag-prompt.test.ts | 6 | RAG prompt building, grounding |

### Auth Integration (11 tests)

| Category | Tests |
|----------|-------|
| Register | 3 (success, duplicate email, missing fields) |
| Login | 3 (valid, invalid password, non-existent user) |
| GET /users/data | 3 (valid token, no token, invalid token) |
| GET /users/resumes | 2 (with resumes, empty) |

### Original Baseline Tests (10 tests)

| Test File | Tests | Status |
|-----------|-------|--------|
| rag.test.js | 3 | ✅ |
| nextLevelFeatures.test.js | 3 | ✅ |
| analytics.test.js | 4 | ✅ |

---

## Test Execution Results

### Latest Run (2026-10-11)

| Suite | Tests | Duration | Status |
|-------|-------|----------|--------|
| Vitest Server (9 files) | 123 | ~12s | ✅ ALL PASS |
| Original Baseline (3 files) | 10 | ~2s | ✅ ALL PASS |
| Client Build | — | ~3s | ✅ SUCCESS |

**Total: 133 tests passing, zero regressions**

---

## Dataset Details

### Valid Resumes (1,000 records, seed=42)

| Dimension | Distribution |
|-----------|--------------|
| Professions | DevOps: 209, PM: 215, UX/UI: 216, Frontend: 215, Backend: 145 |
| Experience | Intern: 200, Junior: 198, Mid: 198, Senior: 201, Staff: 203 |
| Industries | Enterprise: 173, Fintech: 175, Crypto: 66, Gaming: 64, SaaS: 173, EdTech: 37, E-commerce: 135, HealthTech: 106, Consumer: 71 |
| Education | MS: 181, BS: 152, Bootcamp: 181, Self-taught: 152, Associate: 182, PhD: 152 |
| Skill Profile | Generalist: 210, Specialist: 195, Polyglot: 333, Legacy→Modern: 262 |
| Completeness | Complete: 200, No-summary: 201, No-projects: 200, Minimal: 201, No-education: 198 |

### Invalid Test Cases (10 records)

| Case | Description |
|------|-------------|
| empty-object | Completely empty object |
| missing-required-fields | Missing title field |
| invalid-email | Malformed email address |
| malformed-dates | Invalid date strings in experience |
| empty-arrays | All array fields empty |
| unicode-stress | Unicode chars, null bytes |
| extremely-long-text | 10,000 character summary |
| null-values | Null values in skills array |
| negative-experience | End date before start date |
| duplicate-skills | Case-variant duplicates |

---

## Test Architecture

### Isolation Guarantees

- **MongoDB Memory Server**: Ephemeral in-memory database per test file
- **No external dependencies**: All AI services mocked via Vitest mocks
- **ImageKit mocked**: File upload returns test URL
- **Unique DB names**: Per-test-suite database names prevent cross-contamination
- **Clean state**: `beforeEach` clears collections

### Key Files

```
testing/
├── ARCHITECTURE_AUDIT.md      # Architecture analysis & gaps
├── TEST_PLAN.md               # Test execution plan
├── TEST_RESULTS.md            # Detailed test results
├── vitest.config.server.ts    # Vitest config for server
├── vitest.config.client.ts    # Vitest config for client
├── playwright.config.ts       # Playwright config (E2E)
├── setup/
│   ├── test-utils.ts          # Auth helpers, test app factory
│   ├── mock-ai.ts             # OpenAI/embedding mocks
│   └── test-db.ts             # MongoDB Memory Server lifecycle
├── data-generators/
│   ├── cli.ts                 # Generator entry point
│   ├── generate-resumes.ts    # Main generator (deterministic, seeded)
│   ├── generate-resumes.test.ts # 43 generator tests
│   ├── professions.ts         # Profession/industry definitions
│   ├── skills-taxonomy.ts     # Skill pools with aliases
│   ├── institutions.ts        # Schools, companies, dates
│   └── templates.ts           # Resume structure templates
├── fixtures/
│   └── generated/             # 1000 resumes + 10 invalid (gitignored)
├── unit/server/
│   ├── normalization.test.ts
│   ├── evidence.test.ts
│   ├── matching.test.ts
│   ├── embedding.test.ts
│   └── rag-prompt.test.ts
├── integration/server/
│   ├── auth.test.ts
│   ├── resume-crud.test.ts
│   ├── schema-compatibility.test.ts
│   └── crud-with-generated-dataset.test.ts
└── e2e/                       # Playwright tests (future)
```

---

## Adding New Tests

### Unit Test (Server)

```typescript
// testing/unit/server/my-service.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '@server/services/my-service.js';

describe('My Service', () => {
  it('should do something', () => {
    expect(myFunction(input)).toBe(expected);
  });
});
```

### Integration Test (Server)

```typescript
// testing/integration/server/my-feature.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Mock external services
vi.mock('@server/configs/imageKit.js', () => ({
  default: { files: { upload: vi.fn().mockResolvedValue({ url: 'https://test.url' }) } },
}));

// Import after mocks
import myRouter from '@server/routes/myRoutes.js';
import MyModel from '@server/models/MyModel.js';
import { setupTestEnvironment, teardownTestEnvironment, createAuthHeader } from '@testing/setup/test-utils.js';

let mongoServer: MongoMemoryServer;
let app: express.Express;

describe('My Feature', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
    mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'test-my-feature' } });
    await mongoose.connect(mongoServer.getUri());
    app = express();
    app.use(express.json());
    app.use('/api/my', myRouter);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    teardownTestEnvironment();
  });

  beforeEach(async () => {
    await MyModel.deleteMany({});
  });

  it('should do something', async () => {
    const res = await request(app)
      .post('/api/my/endpoint')
      .set(createAuthHeader())
      .send({ data: 'test' });
    expect(res.status).toBe(200);
  });
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate test data
        run: npx tsx testing/data-generators/cli.ts
      
      - name: Run server tests
        run: cd server && npx vitest run
      
      - name: Run baseline tests
        run: cd server && node tests/rag.test.js && node tests/nextLevelFeatures.test.js && node tests/analytics.test.js
      
      - name: Build client
        run: cd client && npm run build
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection timeout | Increase `hookTimeout` in `vitest.config.server.ts` |
| Mongoose OverwriteModelError | Use `vi.mock` for models before import (see existing tests) |
| ImageKit config errors | Mock `@server/configs/imageKit.js` before importing routes |
| Test timeouts | Add timeout to specific test: `it('name', async () => {}, 60000)` |
| Port conflicts | MongoDB Memory Server uses random ports automatically |

---

## Next Workstreams

- **D2**: Authentication & authorization deep testing
- **D3**: Resume upload, parsing, rendering (PDF/DOCX)
- **D4**: Frontend E2E (Playwright)
- **D5**: AI endpoint integration (RAG, skill-gaps, optimizer)
- **D6**: Analytics dashboard & SQLite OLAP queries

---

## Historical Test Results

See `testing/TEST_RESULTS.md` for detailed historical results and `testing/ARCHITECTURE_AUDIT.md` for architecture analysis.