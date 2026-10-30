# Repository guide for coding agents

## Project

AI Resume Builder is a web application for creating resumes, comparing them with job descriptions, tracking skill evidence and gaps, and using AI for text refinement. Match scores are calculated by server code. The LLM is used for text generation and explanations.

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
- `.github/workflows/ci.yml`: server test and client lint/build jobs.
- The root `package.json` forwards common commands to `client/` and `server/`; install dependencies in those package directories.

## Commands

```sh
# Install each package
cd server && npm ci
cd client && npm ci

# Server tests (unit and mocked HTTP tests; no external services)
cd server && npm test
cd server && npm run test:unit
cd server && npm run test:api

# Optional legacy MongoMemoryServer integration suites
cd server && npm run test:legacy-integration

# Client checks
cd client && npm run lint
cd client && npm run build

# Run the application
cd server && npm run server
cd client && npm run dev
```

The default server suite includes deterministic unit tests and mocked HTTP tests. The optional legacy integration command requires MongoMemoryServer and is not run in CI.

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

## Authentication and AI routes

Registration and login issue JWTs. Protected routes accept `Authorization: Bearer <token>` and the legacy raw token header. Middleware verifies the token and sets `req.userId`; user-owned data queries must include that ID. The public resume route only returns resumes marked public.

All `/api/ai/*` routes, `/api/analytics/optimize`, and `/api/optimizer/*` routes use the per-user AI rate limiter after authentication. It sets `X-RateLimit-Limit` and `X-RateLimit-Remaining`; rejected requests use HTTP 429 and `Retry-After`. Redis connection or command failures are logged without request content and fail open.

Only `POST /api/ai/enhance-pro-sum` and `POST /api/ai/enhance-job-desc` use response caching. Cache keys are SHA-256 digests of the endpoint, user ID, and normalized input. Responses set `X-Cache` to `HIT`, `MISS`, or `BYPASS`. Resume upload/parsing, optimization, RAG, and database-writing routes are not cached. Cache failures compute the response without Redis.

## Tests and CI

Tests mock the LLM client, embeddings, vector store, Mongo models used by HTTP validation tests, and Redis. Tests do not call external LLM, embedding, Qdrant, MongoDB, or Redis services. Supertest uses local loopback sockets. CI uses Node.js 22, runs `npm ci` and `npm test` in `server/`, then `npm ci`, `npm run lint`, and `npm run build` in `client/` on pushes and pull requests. No secrets or service containers are configured in CI.

## Conventions

- Keep changes local and narrowly scoped.
- Use small conventional commits.
- Declare dependencies in the package that imports them and update its lockfile.
- Do not log tokens, resume text, job-description text, or other personal data.
- Preserve existing route paths and successful response shapes unless a task requires otherwise.

## Known issues / not fixed

- Resume and job-description text is included in LLM prompts. Prompt-injection hardening beyond current grounding instructions has not been added (`server/services/resumeParserService.js`, `server/services/optimizerService.js`, `server/services/ragService.js`).
- The client stores its JWT in `localStorage` (`client/src/pages/Login.jsx`, `client/src/configs/api.js`).
- The User schema uses `timeStamps` instead of Mongoose's `timestamps` option (`server/models/User.js`).
- Some controller error handlers expose raw error messages or return 400 for database failures (`server/controllers/UserController.js`, `server/controllers/ResumeController.js`, `server/controllers/analyticsController.js`, `server/controllers/optimizerController.js`, `server/controllers/optimizerUploadController.js`). `server/services/explanationService.js` also logs provider error messages.
- `ResumeController.js` references `multer.MulterError` without importing `multer` in its catch block.
- Document upload validation trusts the request MIME type and does not inspect file signatures (`server/configs/multerDocument.js`).
- Client lint currently reports unused imports/variables and React hook rule errors; see `client/src/components/Home/Hero.jsx`, `client/src/components/JDMatchTool.jsx`, `client/src/components/Navbar.jsx`, `client/src/components/PersonalInfoForm.jsx`, `client/src/pages/AnalyticsDashboard.jsx`, `client/src/pages/Dashboard.jsx`, `client/src/pages/Preview.jsx`, `client/src/pages/ResumeBuilder.jsx`, and `client/src/pages/ResumeOptimizer.jsx`.
