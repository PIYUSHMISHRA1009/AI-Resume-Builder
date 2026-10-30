# Repository guide for coding agents

## Project

AI Resume Builder is a web application for creating resumes, comparing them with job descriptions, tracking skill evidence and gaps, and using AI for text refinement. Match scores are calculated by server code. The LLM is used for text generation and explanations. Resume CRUD, document upload, matching, analytics, optimization, and RAG routes exist. An `analyze-jd` endpoint and UI do not exist; do not document them as shipped.

## Stack and layout

- Client: React 19, Vite, Tailwind CSS, Redux Toolkit, Axios.
- Server: Node.js 22, Express 5 using ES modules, Mongoose, SQLite, OpenAI-compatible API, ImageKit, and optional Qdrant and Redis integrations.
- MongoDB stores operational data. SQLite is an analytics read model. `VECTOR_STORE` selects `mongodb`, `qdrant`, or `shadow` retrieval behavior.
- `client/src/`: pages, components, Redux state, API client, and resume templates.
- `server/app.js`: builds and exports the Express app without connecting to databases or listening.
- `server/server.js`: connects MongoDB, initializes Qdrant when selected, then listens.
- `server/routes/`, `controllers/`, `middlewares/`, `models/`, `configs/`: API and server setup.
- `server/services/`: matching, analytics, resume parsing, optimization, RAG, embeddings, and `vectorStore/` implementations.
- `server/utils/`: shared helpers, including document parsing and AI response caching.
- `testing/unit/server/`: deterministic server tests.
- `testing/integration/server/ai-app.test.ts` and `ai-redis.test.ts`: mocked HTTP tests.
- Other `testing/integration/server/` tests use MongoMemoryServer and are opt-in.
- `.github/workflows/ci.yml`: server test and client test/lint/build jobs.
- The root `package.json` forwards common commands to `client/` and `server/`; install dependencies in those package directories.

The client calls Express APIs through `client/src/configs/api.js`, which attaches the saved JWT. Express authenticates protected routes and uses `req.userId` in MongoDB ownership queries. AI text endpoints call the configured OpenAI-compatible provider; Redis optionally enforces per-user limits and caches two text enhancement routes. Matching is computed in server services, with SQLite storing analytics projections. RAG embeddings live in MongoDB and can be retrieved through MongoDB or Qdrant; Qdrant failures fall back to MongoDB in `qdrant` mode, while `shadow` mode returns MongoDB results and compares Qdrant results.

## Commands

```sh
# Install each package
cd server && npm ci
cd client && npm ci

# Root forwarding scripts
npm test
npm run test:all
npm start
npm run dev

# Server tests (unit and mocked HTTP tests; no external services)
cd server && npm test
cd server && npm run test:unit
cd server && npm run test:api
cd server && npm run test:coverage

# Optional legacy MongoMemoryServer integration suites
cd server && npm run test:legacy-integration

# Qdrant operations (dry run does not initialize or write to Qdrant)
cd server && npm run qdrant:check
cd server && npm run qdrant:migrate -- --dry-run
cd server && node scripts/validateQdrantMigration.js

# Client checks
cd client && npm test
cd client && npm run lint
cd client && npm run build

# Run the application
cd server && npm start
cd server && npm run server
cd client && npm run dev
```

`npm start` runs the server on port 3000 by default; `npm run server` uses nodemon. The root `npm run dev` starts only the client, and root `npm run test:all` adds Playwright E2E tests. There is no server `dev` script. The default server suite includes deterministic unit tests and mocked HTTP tests. The optional legacy integration command requires MongoMemoryServer and is not run in CI. The validator is a read-only live check that requires both MongoDB and Qdrant access; it is not a backfill.

## Environment variable names

Set server variables in `server/.env`; set the client API base URL as `VITE_BASE_URL` in `client/.env`.

- `PORT`: server listen port.
- `CLIENT_URL`: additional allowed CORS origin.
- `JWT_SECRET`: JWT signing and verification secret; tokens expire after seven days.
- `MONGODB_URI`: MongoDB connection string. If absent, the server uses local MongoDB.
- `MONGODB_SERVER_SELECTION_TIMEOUT_MS`: MongoDB server selection timeout.
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`: LLM client configuration.
- `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`: embedding model and vector dimension.
- `IMAGEKIT_PRIVATE_KEY`: ImageKit server credential.
- `VECTOR_STORE`: retrieval mode: `mongodb`, `qdrant`, or `shadow`.
- `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION`: Qdrant configuration.
- `RAG_TOP_K`, `RAG_SIMILARITY_THRESHOLD`, `RAG_LOG_EVAL`, `RAG_VECTOR_SEARCH_INDEX`, `RAG_SKILL_GAP_THRESHOLD`: RAG retrieval, evaluation, and skill-gap settings.
- `REDIS_URL`: enables the optional Redis client when set; unset disables Redis.
- `AI_RATE_LIMIT_MAX`: maximum AI requests per user in the fixed window (default 20).
- `AI_RATE_LIMIT_WINDOW_SECONDS`: rate-limit window length (default 3600 seconds).
- `AI_CACHE_TTL_SECONDS`: text enhancement cache lifetime (default 86400 seconds).

Do not commit `.env` files or credentials. `server/.env.example` contains placeholders and safe local defaults only.

## Qdrant operations

- `mongodb` is the default and does not require Qdrant variables. `qdrant` uses Qdrant for retrieval and falls back to MongoDB on Qdrant errors. `shadow` returns MongoDB results while comparing Qdrant retrieval; Qdrant errors leave MongoDB authoritative. Unknown modes, invalid endpoint URLs, and missing Qdrant credentials fall back to `mongodb` with a warning.
- `QDRANT_URL` is the service endpoint, `QDRANT_API_KEY` authenticates requests, and `QDRANT_COLLECTION` selects the collection (default `resume_embeddings`). `EMBEDDING_MODEL` selects the embedding model and `EMBEDDING_DIMENSIONS` configures vector size (default `3072`).
- Bootstrap uses the configured vector size and cosine distance. It creates keyword payload indexes for `userId`, `resumeId`, `embeddingModel`, and `bulletId`. Searches require a `userId` filter; deletes require both `userId` and bullet IDs. Bootstrap does not drop collections or delete points. A dimension or distance mismatch prevents Qdrant retrieval and MongoDB remains the fallback.
- `server/scripts/createQdrantCollection.js` calls the same bootstrap and does not create a separate hard-coded collection configuration.
- Run `cd server && npm run qdrant:check` for the read-only connectivity and collection check. It reports configuration booleans and counts, never credential values.
- Qdrant operational scripts report status without printing raw request errors, which may contain endpoint details.
- The installed `@qdrant/js-client-rest` 1.19 client exposes `query`, not `search`. Query responses use `result.points`; the adapter maps each point to `{ bulletId, text, source, metadata, score }`. The SDK compatibility regression test uses the installed SDK with mocked HTTP. Queries require a `userId` filter, including read-only validation; deletes require `userId` and bullet IDs.
- The read-only migration validator compares eligible MongoDB count with Qdrant count, checks sampled bullets using `userId` and `bulletId` filters, then compares filtered retrieval. It exits nonzero on count or sample mismatch. A sample's own vector may tie with another vector, so nearest-neighbor rank alone is not a presence check.
- Run `cd server && npm run qdrant:migrate -- --dry-run` to count eligible MongoDB bullets without initializing or writing to Qdrant. A real backfill supports `--batch-size`, `--limit`, `--after-id`, and `--checkpoint` options; do not run it against real data without an explicit task request.
- Most Qdrant tests mock the client; the SDK compatibility test uses the installed client with mocked HTTP. Neither contacts live Qdrant.
- Do not repeat a successful live backfill to validate retrieval. The prior backfill processed 98, failed 0, and left 0 eligible; both stores held 98 points. Check read-only first. A real migration writes points and should only run on an explicit migration task.
- If a Qdrant key is exposed, rotate it in the Qdrant console, update `server/.env` locally and the host's environment variables, and never commit the key.

## Authentication and AI routes

Registration and login issue JWTs. Protected routes accept `Authorization: Bearer <token>` and the legacy raw token header. Middleware verifies the token and sets `req.userId`; user-owned data queries must include that ID. The public resume route only returns resumes marked public.

Input validation returns 400 for missing required fields and malformed resume IDs; missing owned records return 404, including resume update/delete. Unexpected controller failures return generic external 5xx messages. Keep provider, database, token, resume, and job-description details out of responses and logs. File upload validation currently relies on MIME types and should not be treated as file-signature verification.

All `/api/ai/*` routes, `/api/analytics/optimize`, and `/api/optimizer/*` routes use the per-user AI rate limiter after authentication. It sets `X-RateLimit-Limit` and `X-RateLimit-Remaining`; rejected requests use HTTP 429 and `Retry-After`. Redis connection or command failures are logged without request content and fail open.

Only `POST /api/ai/enhance-pro-sum` and `POST /api/ai/enhance-job-desc` use response caching. Cache keys are SHA-256 digests of the endpoint, user ID, and normalized input. Responses set `X-Cache` to `HIT`, `MISS`, or `BYPASS`. Resume upload/parsing, optimization, RAG, and database-writing routes are not cached. Cache failures compute the response without Redis.

## Tests and CI

Server tests are in `testing/unit/server/` and `testing/integration/server/`. Most tests mock the LLM client, embeddings, vector store, Mongo models used by HTTP validation tests, and Redis. The SDK API test runs the installed Qdrant client against mocked HTTP. No default test calls external LLM, embedding, Qdrant, MongoDB, or Redis services. Supertest uses local loopback sockets. Client tests use Vitest and local fixtures. CI uses Node.js 22, runs `npm ci` and `npm test` in `server/`, then `npm ci`, `npm run lint`, `npm test`, and `npm run build` in `client/` on pushes and pull requests. No secrets or service containers are configured in CI; live integrations and legacy MongoMemoryServer suites are outside CI coverage.

Evidence must stay separate from test claims: the user observed 88 passing server tests before the SDK fix and a failed live retrieval (`qdrant.search is not a function`). Codex observed 89 passing after the SDK fix and 94 passing after the audit fixes. The user observed a backfill of 98/98 with 0 failures and 0 remaining eligible. A later read-only live check found 98/98 counts, 5/5 filtered overlap and 5/5 sampled points after fixing a nearest-neighbor tie in the validator. Local client tests passed 4/4. Redis live `MISS`/`HIT`/`BYPASS` behavior is still unverified.

## Conventions

- Keep changes local and narrowly scoped.
- Use small conventional commits.
- Declare dependencies in the package that imports them and update its lockfile.
- Do not log tokens, resume text, job-description text, or other personal data.
- Preserve existing route paths and successful response shapes unless a task requires otherwise.
- Work on and push only `career-intelligence` until the user explicitly authorizes work on `main`. Use `git push origin career-intelligence:career-intelligence`; never force push or rewrite history.
- On macOS with zsh, quote paths containing spaces and quote glob patterns. Avoid pasted shell comments in command snippets. Native `sqlite3` builds may need a no-space temporary working copy for clean-install checks.
- Keep this file aligned with actual scripts, behavior, and measured evidence when they change.

## Known issues / not fixed

- Resume and job-description text is included in LLM prompts. Prompt-injection hardening beyond current grounding instructions has not been added (`server/services/resumeParserService.js`, `server/services/optimizerService.js`, `server/services/ragService.js`).
- The client stores its JWT in `localStorage` (`client/src/pages/Login.jsx`, `client/src/configs/api.js`).
- The User schema uses `timeStamps` instead of Mongoose's `timestamps` option (`server/models/User.js`).
- Document upload validation trusts the request MIME type and does not inspect file signatures (`server/configs/multerDocument.js`).
- Live Redis cache and rate-limit behavior still needs a safe environment-backed check. Client route/form coverage and legacy database integration coverage remain limited. The client build may warn about a large output chunk and outdated Browserslist data.
- A clean `npm ci` in a no-space temporary copy succeeded for both packages on macOS Node 22. The npm audit summary reported 15 server and 31 client dependency advisories on 2026-10-30; assess them before changing dependency versions.
- `data/tmp/.gitkeep` is tracked. Multer storage also creates the directory on upload so deployments that omit empty directories continue to work.
- Next tasks: harden upload file signatures and prompt input handling, verify Redis behavior without personal data, and expand client navigation/form coverage. Do not add an `analyze-jd` feature solely to satisfy an audit.
