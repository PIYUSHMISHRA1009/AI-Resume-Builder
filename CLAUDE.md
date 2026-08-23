# Claude Code Project Instructions

## Source of Truth
[`AGENTS.md`](AGENTS.md) is the canonical, living source of truth for this repository.

## Required Workflow
1. Read [`AGENTS.md`](AGENTS.md) before inspecting or making changes.
2. Follow its architecture, data flow guidelines, and coding rules.
3. Inspect existing implementation before modifying or creating code.
4. Run all relevant test suites after changes (`cd server && node tests/rag.test.js && node tests/nextLevelFeatures.test.js && node tests/analytics.test.js`).
5. Update [`AGENTS.md`](AGENTS.md) whenever significant architecture, schemas, APIs, or features change.

## Current Project
This project is the **Career Intelligence & Resume Analytics Platform** detailed in [`AGENTS.md`](AGENTS.md). It features a dual-database architecture (MongoDB OLTP + isolated SQLite OLAP read-model), deterministic skill normalization, evidence extraction, candidate-JD match scoring, relational SQL analytics, and supporting LLM recommendations.

## Precedence Rule
If any instruction or file in this repository conflicts with [`AGENTS.md`](AGENTS.md), **AGENTS.md takes absolute precedence**.