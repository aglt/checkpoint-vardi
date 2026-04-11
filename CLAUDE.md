# Checkpoint Varði (codename: Vardi)

> You are working on Checkpoint Varði, a reusable Icelandic workplace safety
> management platform. Read this file before any change.

## What this project is

A pnpm monorepo (Node 22) hosting a single Next.js 15 App Router app and a
small set of shared packages. The single deployable is `apps/web`; API routes
live under `apps/web/app/api/*`. A Python FastAPI sidecar will be added later
for Icelandic Whisper STT and LibreOffice PDF conversion.

First use case is Verkefni IV at Fjölbrautaskólinn í Breiðholti, but the
platform must remain reusable for real safety officers and future assignments.

## Load context first

- Read this file.
- Read `docs/ARCHITECTURE_BOUNDARIES.md` when touching package boundaries.
- Read the relevant skill under `.claude/skills/` for the area you are changing.

## Hard rules

1. **English in code, Icelandic in data.** Component source, type names,
   enums, filenames, comments are English. Only user-facing strings are
   localised, and those live in translation tables or a UI dictionary.
2. **No direct `fetch()` in server components or client components.** All API
   calls go through a typed client built from `@vardi/schemas` Zod contracts.
3. **`ownerId` on every user-owned entity.** Enforce in the route handler via
   a single `getCurrentUser()` helper. No cross-user reads even before real
   auth ships.
4. **Translation tables, not JSON columns.** Every entity that carries
   human-readable content has a sibling `*_translation` table keyed by
   `(entityId, language)` with ISO 639-1 codes. Fallback to `is`.
5. **Shared packages never import each other.** The only upward edge allowed
   is `apps/web` importing from `@vardi/*`. ESLint enforces this — do not
   disable it.
6. **No emoji in committed code or docs** unless the surrounding file already
   uses them.

## Workflow

- Branch names: `feat/<area>-<short>`, `fix/<area>-<short>`, `chore/<short>`.
- Commit messages: imperative, scoped (`feat(risk): add 3x3 matrix lookup`).
- Every PR: typecheck + lint + test green; acceptance criterion from the
  relevant user story referenced in the description.
- Definition of Done lives in the Implementation Handoff document.

## File ownership map

| Area | Owner directory |
|---|---|
| Data model, migrations | `packages/db` |
| Contracts (Zod) | `packages/schemas` |
| Risk engine | `packages/risk` |
| Export templates | `packages/export` |
| Seed loading + parser bridge | `packages/checklists` |
| UI primitives | `packages/ui` |
| App routes, pages, API handlers | `apps/web` |

Keep changes inside the smallest owner directory that makes sense. Cross-package
changes need a short rationale in the PR description.
