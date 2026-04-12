# EPIC: Checkpoint Vardi

## Purpose

This file is the high-level container for the local story system. It should describe the active
epic's scope, guardrails, and sequencing once real stories are added.

## Current State

- the story system exists locally under `user_stories/`
- `S0-01` is complete and now lives under `done/`
- `S1-01` is complete and now lives under `done/`
- `S1-02` is complete and now lives under `done/`
- `S1-03` is complete and now lives under `done/`
- `S1-04` is complete and now lives under `done/`
- `S1-05` is complete and now lives under `done/`
- `S1-06` is complete and now lives under `done/`
- `S1-07` is complete and now lives under `done/`
- `S1-08` is complete and now lives under `done/`
- `S1-10` is complete and now lives under `done/`
- `S1-11` is complete and now lives under `done/`
- `S1-12` is complete and now lives under `done/`
- `S1-13` is complete and now lives under `done/`
- `S1-14` is complete and now lives under `done/`
- `S1-17` is complete and now lives under `done/`
- `S1-18` is complete and now lives under `done/`
- `S1-09` and `S1-15` through `S1-16` are staged under `not_started/`
- the next implementation story is `S1-15`
- the maintenance workflow is defined by `$vardi-story-management`

## How To Use This Epic

The active stage is currently:

- **S1 - MVP assessment workflow**
- Most recently completed story: `S1-18 - Risk severity choice alignment with the reference workflow`
- Story file: `user_stories/epics/checkpoint_vardi/done/S1-18-risk-severity-choice-alignment.md`
- Next story: `S1-15 - Sector/profile-specific assessment rules via seed-owned runtime extensions`

Any agent changing story state must update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the
story file or folder in the same change. Invoke `$vardi-story-management`.

## Active Stage

### S1 - MVP assessment workflow

The completed delivery slice now runs from `S1-02` through `S1-14`, with
`S1-17` tightening the same MVP flow by making app-owned web copy render
consistently through a single request-derived app-language seam. Together
these stories moved the repo from "runnable scaffold" to a
teacher-deliverable assessment flow with truthful browser regression
coverage for smoke and blocked-readiness behavior plus language-consistent
start, walkthrough, risk-register, and summary surfaces: seed truth,
assessment data model, assessment start, walkthrough capture, transfer into
the risk register, risk scoring, summary capture, final exports, browser
proof that the real app boots and that the current blocked-readiness path
behaves honestly, the app-owned copy seam that keeps Icelandic and
English rendering from leaking into each other, and now a dedicated
app-owned progression owner that keeps guided status and completion
truth tied to persisted workflow state plus persisted saved reasoning on
risk classifications that exports can render from stored truth only.

`S1-01` established the canonical seed runtime truth and the package-owned
read seam that every later S1 story depends on. `S1-02` established the narrow
persisted assessment truth and the app-owned composed walkthrough read seam.
`S1-03` materialized runnable assessment instances from seeded templates
without widening into walkthrough editing. `S1-04` now completes the core
walkthrough form slice by rendering seeded sections and criteria and persisting
criterion-level answers onto the existing finding rows. `S1-05` now completes
the deterministic Step `1b` bridge by transferring persisted `notOk` findings
into `risk_entry` rows without widening into risk editing or scoring. `S1-06`
now completes the next narrow slice by editing those transferred rows in-flow
and deriving reproducible risk levels from pinned seeded matrix truth without
widening into summary or export work. `S1-07` now completes the final in-app
assessment flow by persisting the step-6 summary and computing export
readiness from persisted walkthrough, transfer, classification, and summary
state. `S1-08` now completes the teacher-deliverable MVP path by mapping the
persisted assessment state into deterministic checklist, register, and summary
exports plus a downloadable Word/PDF bundle on the summary step. `S1-10` now
adds the first Playwright-based browser-level proof layer together with a
deterministic isolated SQLite bootstrap for local runs, explicit runtime/testing
DB entrypoints, and a truthful blocked-readiness workflow spec. `S1-11` now
introduces persisted mitigation planning on `risk_entry` rows, `S1-12` now
hardens truthful progression and completion guards through an app-owned
persisted-state projection, `S1-13` captures
explicit saved reasoning for risk classifications, `S1-14` now reframes
exports around persisted assessment metadata, provenance, ordered
sections, and code-only unresolved-reference handling without widening
domain rules, `S1-15` lets a small supported rule set flow from
seed/runtime truth into the app, and `S1-16` closes the current
browser-proof queue with a later stable regression once those
flow-shaping slices settle, while `S1-17` now completes the focused
language-consistency follow-up that removes mixed app-language copy from
the current MVP web flow and `S1-18` is the separate
severity-alignment repair for the screenshot-backed named risk choice. It now
lands as an app-owned grouped severity choice in the risk register, keeps the
exact saved likelihood/consequence pair explicit, and keeps the summary
priority badge aligned with the same saved `riskLevel` mapping without widening
into export-language changes.
`S1-09` still exists only as a narrow bridge story if a concrete
post-MVP need surfaces for broader platform groundwork.

### S0 - Foundations

`S0-01` completed the narrow baseline step: take the scaffold from "files on disk" to
"runnable empty project" without widening into feature work, schema work, or product behavior.

This baseline now gives later stories a trustworthy install, lint, typecheck, test, build, and
dev-server loop. Stage One now has its first browser-proof baseline through
`S1-14` plus the current app-language consistency and severity-alignment
follow-ups through `S1-17` and `S1-18`; the next staged story is `S1-15`,
`S1-16` remains the later browser-export regression proof once the
runtime-rule slice settles, and `S1-09` stays conditional and non-blocking.

## Guardrails

- Keep this file at the epic level, not the task level.
- Put implementation details in the story file, not here.
- If a story changes status, keep this file aligned with the tracker and execution plan.
- Do not seed speculative backlog items here unless the user explicitly asks for them.
