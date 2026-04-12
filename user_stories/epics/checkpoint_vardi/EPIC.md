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
- `S1-09` remains staged under `not_started/` only as a conditional bridge story
- there is no required next implementation story queued right now
- the maintenance workflow is defined by `$vardi-story-management`

## How To Use This Epic

The active stage is currently:

- **S1 - MVP assessment workflow**
- Most recently completed story: `S1-10 - Browser E2E testing foundation`
- Story file: `user_stories/epics/checkpoint_vardi/done/S1-10-browser-e2e-testing-foundation.md`
- Next story: none queued; `S1-09` stays conditional and non-blocking unless a concrete follow-up need appears

Any agent changing story state must update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the
story file or folder in the same change. Invoke `$vardi-story-management`.

## Active Stage

### S1 - MVP assessment workflow

The completed delivery slice now runs from `S1-02` through `S1-10`. Together these stories moved
the repo from "runnable scaffold" to a teacher-deliverable assessment flow with truthful browser
regression coverage: seed truth, assessment data model, assessment start, walkthrough capture,
transfer into the risk register, risk scoring, summary capture, final exports, and now
Playwright-backed end-to-end verification of the real MVP path.

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
adds Playwright-based browser-level proof for the real MVP flow together with a
deterministic isolated SQLite bootstrap for local runs and repo-local guidance
for extending that suite honestly. `S1-09` still exists only as a narrow bridge
story if a concrete post-MVP need surfaces for broader platform groundwork.

### S0 - Foundations

`S0-01` completed the narrow baseline step: take the scaffold from "files on disk" to
"runnable empty project" without widening into feature work, schema work, or product behavior.

This baseline now gives later stories a trustworthy install, lint, typecheck, test, build, and
dev-server loop. Stage One is now complete through `S1-10`, while `S1-09`
remains conditional and non-blocking.

## Guardrails

- Keep this file at the epic level, not the task level.
- Put implementation details in the story file, not here.
- If a story changes status, keep this file aligned with the tracker and execution plan.
- Do not seed speculative backlog items here unless the user explicitly asks for them.
