---
name: vardi-web-data-boundary
description: Schema and route-boundary guidance for Checkpoint Vardi. Use when adding or reviewing request and response contracts, route handlers, typed client helpers, parsing, normalization, or persistence-facing DTOs in this repo.
---

# Vardi Web Data Boundary

Use this skill when data crosses a boundary.

## Load context first

- Read `../../../docs/ARCHITECTURE_BOUNDARIES.md`.
- Read `../vardi-web-architecture/SKILL.md`.
- Inspect the active story under `../../../user_stories/`.

## Boundary owners

- `packages/schemas`: shared request and response contracts
- `packages/db`: database-facing schema and query helpers
- `packages/checklists`: import parsing and normalization
- `packages/risk`: pure calculation logic
- `apps/web/app/api`: HTTP boundary
- `apps/web/lib`: app-level typed callers and orchestration helpers when needed

## Rules

- Define request and response contracts once in `packages/schemas`.
- Validate at the route boundary.
- Route handlers call package code; they do not absorb business logic.
- Keep database writes and reads behind `packages/db`.
- If client-side fetching is required, hide URL strings and parsing behind a typed module.
- Do not duplicate validation rules inline in components, pages, or route files.

## Route workflow

1. Add or update the contract in `packages/schemas`.
2. Implement the route handler in `apps/web/app/api/**/route.ts`.
3. Parse the request early and return a client-safe error on invalid input.
4. Resolve identity through the shared helper before user-owned reads or writes.
5. Call the owning package for persistence or domain logic.
6. Shape the response from the shared contract instead of inventing a local object.

## Design guardrails

- Prefer small contract increments over giant speculative schemas.
- Keep normalized data shapes boring and explicit.
- Treat localization as data, not inline UI text.
- If a route needs a reusable caller, create a typed app helper instead of copying `fetch()` calls.
- If the contract changes, update the story docs and tests in the same change.

## Good outcomes

- one source of truth for request validation
- consistent error envelopes
- route files that stay thin
- package code that can be tested without a browser

## Anti-patterns

- writing a schema in the route file because the package contract does not exist yet
- returning different response shapes from the same route across call sites
- placing parsing logic in components
- mixing raw database queries into route handlers
