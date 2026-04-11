# Checkpoint Varði

> Codename: **Vardi** · Workplace safety management platform for Icelandic workplaces.

Checkpoint Varði is a reusable web platform for creating, running, and exporting
Icelandic workplace risk assessments and the full written safety plan
(*skrifleg áætlun um öryggi og heilbrigði*) required by Lög nr. 46/1980 and
Reglugerð 920/2006.

The name comes from *varði* — the stone cairns that marked the safe path
across Icelandic lava fields and highlands. A checkpoint is where you stop,
verify, and decide whether to proceed. That's what this platform does for work.

## Prerequisites

- **Node.js 22+** — `nvm use` (see `.nvmrc`)
- **pnpm 10** — `corepack enable && corepack prepare pnpm@10.6.5 --activate`
- **Docker Desktop** — for the Python doc-worker sidecar (voice + PDF conversion)

## Quickstart

```bash
pnpm install
pnpm dev            # starts apps/web on http://localhost:3000
pnpm typecheck
pnpm lint
pnpm test
```

## Project Structure

```
apps/
  web/                Next.js 15 App Router — UI + /api route handlers

packages/
  config/             Shared TS + ESLint base configs, env constants
  ui/                 Shared shadcn/ui components + Tailwind theme
  schemas/            Zod contracts shared between UI and API
  db/                 Drizzle ORM schema, migrations, typed client
  risk/               Risk matrix lookup + classify(matrixId, L, C)
  export/             docxtemplater templates (checklist, register, summary)
  checklists/         Seed loader + vísir import normaliser + canonical seed assets
```

Single deployable app. API lives inside apps/web under `app/api/*`.
A Python FastAPI sidecar (`services/doc-worker`) will be added in stage S1 for
Icelandic Whisper transcription and LibreOffice PDF conversion.

## Story Tracking

Implementation now tracks inside this repo:

- `user_stories/epics/checkpoint_vardi/EPIC.md` — epic scope and phase design
- `user_stories/epics/checkpoint_vardi/TRACKER.md` — story status and next-up order
- `user_stories/epics/checkpoint_vardi/EXECUTION_PLAN.md` — session-by-session prompts
- `AGENTS.md` — Codex-facing repo guide and local skill map

## Architecture Invariants

- Code in **English**. Human content strings in **Icelandic** (and later en/pl).
- All human-readable strings live in sibling `*_translation` tables keyed by
  `(entityId, language)` with ISO 639-1 codes. Never inline Icelandic in
  component source.
- All API mutation routes go through Zod-validated handlers in
  `apps/web/app/api`. No direct `fetch()` in server components — use the typed
  client from `@vardi/schemas`.
- `ownerId` on every user-owned entity from day one, even before real auth.
  A single `getCurrentUser()` helper returns a placeholder until auth lands.
- Translation tables, not JSON columns, for i18n of DB content.
- Risk scores are derived server-side via `@vardi/risk`. L/C are stored;
  level is recomputed on read or pinned at write against `riskMatrixId`.
- See `docs/ARCHITECTURE_BOUNDARIES.md` for the full invariant set.

## Documentation

The local story system is the implementation source of truth for day-to-day work.
In-repo design and seed material lives here:

- `docs/handoff/CheckpointVardi_SystemDesign.md` — product, regulatory, architectural narrative
- `docs/handoff/CheckpointVardi_ImplementationHandoff.md` — execution-oriented handoff and delivery plan
- `docs/diagrams/` — editable Mermaid sources for the architecture and flow diagrams
- `packages/checklists/assets/seeds/` — checklist, legal-reference, and risk-matrix seed JSON
- `docs/archive/System_Design_Vindhlif.md` — archived alternate-name design draft

## License

Proprietary — all rights reserved.
