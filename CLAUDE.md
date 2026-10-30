# Claude Code Project Instructions

## Source of Truth
[`AGENTS.md`](AGENTS.md) is the canonical, living source of truth for this repository.

## Required Workflow
1. Read [`AGENTS.md`](AGENTS.md) before inspecting or making changes.
2. Follow its architecture, data flow guidelines, and coding rules.
3. Inspect existing implementation before modifying or creating code.
4. Run relevant checks after changes: `cd server && npm test`; for client changes, run `cd client && npm run lint && npm run build`.
5. Update [`AGENTS.md`](AGENTS.md) whenever architecture, schemas, APIs, commands, or environment variables change.

## Current Project
This project is the AI Resume Builder detailed in [`AGENTS.md`](AGENTS.md). MongoDB stores operational data, SQLite supports analytics queries, matching is computed in server code, and LLM calls support text enhancement and recommendations.

## Precedence Rule
If any instruction or file in this repository conflicts with [`AGENTS.md`](AGENTS.md), **AGENTS.md takes absolute precedence**.
