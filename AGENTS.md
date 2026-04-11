# Checkpoint Vardi Codex Guide

Read this file before making changes in this repository.

## What this repo is

- One Next.js 15 App Router app in `apps/web`
- Shared packages in `packages/*`
- One active story system under `user_stories/`

## Load context first

- Read `CLAUDE.md`.
- Read `docs/ARCHITECTURE_BOUNDARIES.md` when touching ownership or package placement.
- Read the active epic docs in `user_stories/epics/checkpoint_vardi/EPIC.md`, `TRACKER.md`, and `EXECUTION_PLAN.md`.
- Read `docs/handoff/CheckpointVardi_ImplementationHandoff.md` and `docs/handoff/CheckpointVardi_SystemDesign.md` for broader product, architecture, and delivery context when the change needs it.
- Read the matching skill under `.claude/skills/` before changing a feature area.

## Reference assets

- Editable Mermaid architecture sources live in `docs/diagrams/`.
- Canonical seed JSON for checklist, legal-reference, and matrix work lives in `packages/checklists/assets/seeds/`.
- The alternate-name design draft is archived at `docs/archive/System_Design_AlternateNameDraft.md`.

## Repo rules

- English in code. Icelandic belongs in data or dictionaries, not source identifiers.
- Every user-owned record needs `ownerId`.
- Use sibling translation tables, not JSON columns, for localized content.
- Shared packages never import each other.
- No direct `fetch()` in components. Go through typed route/client helpers.
- No raw SQL in app code. Keep database access in `packages/db`.
- Keep changes inside the smallest owner directory that fits the problem.
- When normalizing seed or runtime truth, keep structural normalization separate from behavior-changing domain-rule changes unless the active story explicitly authorizes both.
- When seed catalogs include unresolved imported legal-reference placeholders, treat them as linkage-only records until resolved. Do not surface them as authoritative legal titles in user-facing UI or exports.

## Story tracking

- The active epic lives in `user_stories/epics/checkpoint_vardi/`.
- When story state changes, update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the story file in the same change.
- Use `$vardi-story-management` whenever you add a story, move a story between folders, or change story status wording.

## Local skills

- `vardi-story-management`: keep story docs and folders in sync
- `vardi-web-architecture`: package ownership, boundaries, and change design
- `vardi-web-data-boundary`: schemas, route handlers, typed data flow
- `vardi-web-hooks`: lean React hook usage for interactive surfaces
- `vardi-web-error-handling`: consistent API and UI failure handling
- `vardi-web-unit-testing`: scoped automated test patterns
- `vardi-web-e2e-testing`: browser-level verification patterns when E2E exists
- `modern-premium-web`: product-specific visual direction for public and workspace UI
