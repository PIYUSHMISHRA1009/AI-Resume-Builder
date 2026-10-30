# Test Plan — AI Resume Builder Automated Testing System

**Objective:** Build a reliable, reproducible automated testing system that generates 1,000+ distinct synthetic resume test records and tests the application against them, achieving broad coverage of all implemented features.

**Constraint:** Zero regressions to existing functionality. All testing infrastructure added in `testing/` directory; no modifications to application source without explicit approval.

---

## Phase A: Architecture Audit ✅ COMPLETE
- Created `testing/ARCHITECTURE_AUDIT.md` with full feature inventory, data flows, test gaps, and risks.

---

## Phase B: Establish Test Infrastructure

### B.1 Tool Selection (Compatible with Existing Stack)

| Layer | Tool | Rationale |
|-------|------|-----------|
| Unit/Integration (Server) | **Vitest** | Native ESM, Vite-compatible, fast, supports `node:test` API |
| API Integration | **Supertest** | Express-native, no separate test server needed |
| Test Database | **MongoDB Memory Server** | Ephemeral, isolated, no external dependency |
| AI Mocking | **MSW (Mock Service Worker)** + **Vitest mocks** | Intercepts `openai` client calls, no real API charges |
| Frontend Unit | **Vitest + React Testing Library** | Same runner as server, component testing |
| E2E | **Playwright** | Cross-browser, reliable, good CI support |
| Load Testing | **k6** (optional, separate) | Scriptable, CLI, good for CI |

### B.2 Directory Structure (to create)

```
testing/
├── ARCHITECTURE_AUDIT.md           # ✅ Done
├── TEST_PLAN.md                    # This file
├── vitest.config.ts                # Vitest config (server + client)
├── playwright.config.ts            # Playwright config
├── setup/                          # Test setup & utilities
│   ├── test-db.ts                  # MongoDB Memory Server lifecycle
│   ├── mock-ai.ts                  # OpenAI/Embedding mocks
│   ├── test-utils.ts               # Helpers (auth, requests, cleanup)
│   └── fixtures.ts                 # Synthetic data generators
├── fixtures/
│   ├── generated/                  # 1000+ synthetic resumes (JSON)
│   └── static/                     # Hand-crafted edge cases
├── unit/                           # Pure logic tests (port existing)
│   ├── server/
│   │   ├── normalization.test.ts
│   │   ├── evidence.test.ts
│   │   ├── matching.test.ts
│   │   ├── embedding.test.ts
│   │   └── rag-prompt.test.ts
│   └── client/
│       └── components/
├── integration/                    # API + DB tests
│   ├── server/
│   │   ├── auth.test.ts
│   │   ├── resume-crud.test.ts
│   │   ├── ai-endpoints.test.ts
│   │   ├── analytics.test.ts
│   │   └── optimizer.test.ts
│   └── client/
├── e2e/                            # Playwright browser tests
│   ├── auth.spec.ts
│   ├── resume-builder.spec.ts
│   ├── jd-match.spec.ts
│   └── optimizer.spec.ts
├── performance/                    # k6 scripts (optional)
│   └── load-test.js
├── data-generators/                # Synthetic resume generation
│   ├── generate-resumes.ts         # Main generator (1000+ records)
│   ├── professions.ts              # Profession/industry definitions
│   ├── skills-taxonomy.ts          # Skill pools with aliases
│   ├── institutions.ts             # Schools, companies, dates
│   └── templates.ts                # Resume structure templates
└── reports/                        # Test outputs (gitignored)
```

### B.3 Package.json Scripts (to add)

**server/package.json:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:api": "vitest run testing/integration/server",
    "test:unit": "vitest run testing/unit/server"
  },
  "devDependencies": {
    "vitest": "^2.x",
    "supertest": "^7.x",
    "mongodb-memory-server": "^10.x",
    "msw": "^2.x",
    "@types/supertest": "^6.x",
    "@vitest/coverage-v8": "^2.x"
  }
}
```

**client/package.json:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed"
  },
  "devDependencies": {
    "vitest": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x",
    "playwright": "^1.48.x",
    "@playwright/test": "^1.48.x",
    "jsdom": "^25.x",
    "@vitest/coverage-v8": "^2.x"
  }
}
```

**Root package.json:**
```json
{
  "scripts": {
    "test": "npm --prefix server run test && npm --prefix client run test",
    "test:all": "npm run test && npm --prefix client run test:e2e",
    "test:generate-data": "node testing/data-generators/generate-resumes.ts"
  }
}
```

---

## Phase C: Generate 1,000+ Synthetic Resumes

### C.1 Design Principles

- **Deterministic & Seeded:** Same seed → same 1000 records (reproducible)
- **Schema-Compliant:** Matches `Resume` Mongoose schema exactly
- **Realistic Variation:** Professions, industries, experience levels, education, skills
- **Edge Cases Included:** Empty arrays, missing optional fields, Unicode, long text, malformed dates
- **Separation:** Valid dataset vs. deliberately invalid test cases
- **No Real PII:** Synthetic names, `example.com` emails, fictional companies

### C.2 Variation Axes (Minimum 1000 Unique Combinations)

| Dimension | Values | Combination Factor |
|-----------|--------|-------------------|
| Profession | 12 (SWE, Data, PM, Design, DevOps, QA, Security, ML, Mobile, Web, Cloud, Tech Lead) | 12 |
| Experience Level | 5 (Intern, Junior, Mid, Senior, Staff/Principal) | 5 |
| Industry | 8 (Fintech, HealthTech, EdTech, E-commerce, SaaS, Gaming, Crypto, Enterprise) | 8 |
| Education | 6 (PhD, MS, BS, Bootcamp, Self-taught, Associate) | 6 |
| Skill Profile | 4 (Specialist, Generalist, Polyglot, Legacy→Modern) | 4 |
| Resume Completeness | 4 (Complete, Minimal, No Projects, No Summary) | 4 |
| **Theoretical combinations** | | **23,040** |

→ Sampling 1000 from 23,040 space ensures broad coverage.

### C.3 Generator Implementation (`testing/data-generators/generate-resumes.ts`)

```typescript
// Core interface matching Resume schema
interface SyntheticResume {
  title: string;
  template: 'classic' | 'modern' | 'minimal' | 'minimal-image';
  accent_color: string;
  professional_summary: string;
  skills: string[];
  personal_info: {
    full_name: string;
    profession: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
    image: string;
  };
  experience: Array<{
    company: string;
    position: string;
    start_date: string;
    end_date: string;
    description: string;
    is_current: boolean;
  }>;
  project: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduation_date: string;
    gpa: string;
  }>;
  // Metadata for test selection
  _meta: {
    profession: string;
    experienceLevel: string;
    industry: string;
    educationLevel: string;
    skillProfile: string;
    completeness: string;
    seed: number;
  };
}
```

### C.4 Output Format

- **Primary:** `testing/fixtures/generated/resumes-{seed}.json` — array of 1000 resume objects
- **Index:** `testing/fixtures/generated/index.json` — metadata for filtering (profession, level, etc.)
- **Invalid Set:** `testing/fixtures/generated/invalid-resumes.json` — edge cases for negative testing
- **PDF Subset:** Generate ~50 PDFs only for upload/extraction tests (on-demand)

---

## Phase D: Test Resume Functionality (Coverage Matrix)

| Feature Area | Test Type | Count | Data Source |
|--------------|-----------|-------|-------------|
| **Auth** | Integration | 8 | Static fixtures |
| Register/Login/Token Refresh/Expiry/Invalid/Expired/Malformed/Role | | | |
| **Resume CRUD** | Integration | 12 | 1000 generated |
| Create/Read/Update/Delete/List/Public/Private/Template Switch/Color/Versioning | | | |
| **Resume Fields** | Unit + Integration | 50 | Generated + Edge |
| All schema fields, nested objects, arrays, defaults, validation | | | |
| **PDF Upload/Parse** | Integration | 20 | 50 generated PDFs |
| Valid PDF/DOCX/Empty/Corrupted/Large/Unicode/Scanned | | | |
| **Image Upload** | Integration | 8 | Static fixtures |
| Valid/Invalid type/Size limit/Bg removal/Failure/No file | | | |
| **AI Enhancement** | Unit (mocked) | 15 | Static prompts |
| Summary/JD/Upload parse — success, error, timeout, rate limit, malformed | | | |
| **RAG Pipeline** | Unit + Integration | 25 | 100 resumes |
| Index/Tailor/Refine/Gaps/Logs — grounding, hit rate, feedback boost | | | |
| **JD Parse & Match** | Integration | 30 | 200 JD + 1000 resumes |
| Parse/Extract/Evidence/Score/Weights/Explanation — all 5 dimensions | | | |
| **Versioning** | Integration | 12 | 100 resumes |
| Create/List/Progression (LAG)/Comparison | | | |
| **Analytics Dashboard** | Integration | 18 | Seeded SQLite |
| KPIs/Demanded Skills/Gap Ranking/Version Progression | | | |
| **Optimizer Pipeline** | Integration | 20 | 50 match records |
| Upload/Analyze/Recommend/Apply/Re-evaluate/Before-After | | | |
| **Frontend Flows** | E2E (Playwright) | 12 | Seeded users |
| Login→Builder→Save→Preview→Match→Optimize→Export | | | |

**Total Test Cases: ~240+** (not counting parameterized variations from 1000 resumes)

---

## Phase E: Execution & Validation

### E.1 Baseline Establishment (Pre-Testing)
```bash
# 1. Record current git status
git status --short > testing/reports/baseline-git-status.txt

# 2. Run existing tests
cd server && node tests/rag.test.js
cd server && node tests/nextLevelFeatures.test.js
cd server && node tests/analytics.test.js

# 3. Build frontend
cd client && npm run build

# 4. Lint (if configured)
cd client && npm run lint
```

### E.2 Test Execution Order
```bash
# 1. Generate test data
npm run test:generate-data

# 2. Unit tests (no DB, no AI)
npm --prefix server run test:unit
npm --prefix client run test

# 3. Integration tests (with test DB, mocked AI)
npm --prefix server run test:api

# 4. E2E tests (full stack, mocked AI)
npm --prefix client run test:e2e

# 5. Regression check
# Compare: build, lint, existing test results vs baseline
```

### E.3 Success Criteria

| Criterion | Target |
|-----------|--------|
| All existing tests pass | ✅ No regressions |
| New unit tests pass | > 90% coverage on services |
| Integration tests pass | All 240+ cases |
| E2E critical paths pass | 12/12 core flows |
| 1000 resumes processed | CRUD, match, optimize all succeed |
| No real API calls in CI | All AI mocked |
| Test runtime | < 5 min unit, < 15 min integration, < 20 min E2E |

---

## Phase F: Reporting & Documentation

### F.1 Required Outputs
1. **`testing/ARCHITECTURE_AUDIT.md`** ✅ Done
2. **`testing/TEST_PLAN.md`** (this file)
3. **`testing/reports/BASELINE_REPORT.md`** — pre-testing state
4. **`testing/reports/TEST_RESULTS.md`** — post-testing summary
5. **`testing/reports/REGRESSION_LOG.md`** — any failures, pre-existing vs new
6. **`testing/reports/COVERAGE_REPORT.md`** — coverage summary

### F.2 Regression Log Template
```markdown
## Regression Log

### Pre-existing Failures (Baseline)
| Test | Error | Known Since |
|------|-------|-------------|

### New Failures (Introduced by Testing Infra)
| Test | Error | Root Cause | Fix Required |
|------|-------|------------|--------------|

### Unverified Features
| Feature | Reason |
|---------|--------|
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Test DB conflicts with dev DB | MongoDB Memory Server (ephemeral, random port) |
| Real AI API charges | MSW mocks for all `openai` calls; opt-in `TEST_REAL_AI=true` |
| Flaky E2E tests | Retry logic, explicit waits, seeded test users |
| Large fixture generation slow | Generate once, cache in `testing/fixtures/generated/` |
| PDF generation heavy | Only 50 PDFs; use `pdfkit` for synthetic, not real parsing |
| CI timeouts | Parallelize with Vitest `pool: 'threads'`; shard Playwright |

---

## Next Steps (Immediate)

1. ✅ **Phase A Complete** — Architecture audit documented
2. **Phase B** — Initialize Vitest, Supertest, MongoDB Memory Server, MSW mocks
3. **Phase C** — Build deterministic resume generator (target: 1000 records)
4. **Phase D** — Port existing pure-logic tests to Vitest; add integration tests
5. **Phase E** — Add Playwright E2E for critical user flows
6. **Phase F** — Run full suite, document results, report regressions

---

## Approval Required Before

- Modifying any file in `server/` or `client/src/` (except test-specific config)
- Adding dependencies to production `package.json` (devDependencies OK)
- Running tests against non-ephemeral databases
- Committing generated fixture files > 10MB

---

*This plan is a living document. Update as infrastructure is built and findings emerge.*