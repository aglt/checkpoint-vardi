---
name: vardi-web-architecture
description: Architecture guidance for Checkpoint Vardi. Use when planning, implementing, or reviewing work that touches package ownership, route boundaries, persistence placement, localization contracts, or multi-file feature design in this repo.
---

# Vardi Web Architecture

Use this skill for any change where code placement or end-to-end shape matters.

## Load context first

- Read `../../../AGENTS.md`.
- Read `../../../CLAUDE.md`.
- Read `../../../docs/ARCHITECTURE_BOUNDARIES.md`.
- Read `../../../docs/handoff/CheckpointVardi_ImplementationHandoff.md` and `../../../docs/handoff/CheckpointVardi_SystemDesign.md` when the change affects product scope, core workflows, or cross-package design.
- Read the active story under `../../../user_stories/`.
- Pull in `../vardi-web-data-boundary/SKILL.md` when the change crosses a route or schema edge.

## Reference material

- `docs/handoff/CheckpointVardi_ImplementationHandoff.md`: execution-oriented backlog, schema, and API context
- `docs/handoff/CheckpointVardi_SystemDesign.md`: rationale and broader system framing
- `docs/diagrams/*.mmd`: editable Mermaid sources for architecture and flow references
- `packages/checklists/assets/seeds/manifest.json`: seed catalog entry point
- `packages/checklists/assets/seeds/*.json`: canonical in-repo source data for checklist, legal-reference, and matrix work

## Repo shape

- One app: `apps/web`
- Shared packages: `config`, `ui`, `schemas`, `db`, `risk`, `export`, `checklists`
- Shared packages do not import each other
- `apps/web` is the only package that composes package output together

## Ownership map

- `packages/config`: shared config and constants
- `packages/ui`: presentational UI primitives and styles
- `packages/schemas`: request, response, and shared wire contracts
- `packages/db`: database schema, migrations, and query helpers
- `packages/risk`: pure risk-calculation logic
- `packages/export`: export shaping and template helpers
- `packages/checklists`: parsing, normalization, and import helpers
- `apps/web`: route handlers, pages, layouts, server composition, client entry points

## Decision rules

- Prefer server-first flows in App Router. Add client state only when interaction requires it.
- No direct `fetch()` in components. Use typed helpers or route/client modules.
- No raw SQL in app code. Database access belongs in `packages/db`.
- Keep one owner directory per concern. If two packages need the same helper, the design is probably off.
- Keep English identifiers in code. Localized user content belongs in data or dictionaries.
- Every user-owned record needs `ownerId`.
- Use sibling translation tables for localized records.
- Do not widen a story silently. Create a follow-up story instead.

## Placement heuristics

- Add new wire contracts in `packages/schemas`.
- Add persistence primitives and queries in `packages/db`.
- Add route handlers in `apps/web/app/api/**/route.ts`.
- Add app-only orchestration in `apps/web/lib/**` or feature-local modules.
- Add shared UI to `packages/ui` only when more than one app surface needs it.
- Keep feature-specific UI in `apps/web`.

## Change workflow

1. Identify the story and its owner directories.
2. Write down the end-to-end flow: input, validation, persistence, output, UI.
3. Place each step in its owner package.
4. Keep the boundary typed before adding convenience abstractions.
5. Verify the diff does not cross package boundaries without a reason.

## Review checklist

- right owner directory
- no shared-package cross-imports
- route boundary is schema-backed
- no raw SQL outside `packages/db`
- no localized content hardcoded in source when a dictionary or translation record is expected
- verification is scoped to the affected path

## Anti-patterns

- adding generic helpers in `apps/web` for logic that belongs in a package
- pushing package-only logic into pages because it is faster in the moment
- widening a UI story into schema or persistence redesign without updating the story docs
- copying validation rules into route handlers instead of importing them
