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
- `S1-09` through `S1-16` are now staged under `not_started/`
- the next implementation story is `S1-10`
- the maintenance workflow is defined by `$vardi-story-management`

## How To Use This Epic

The active stage is currently:

- **S1 - MVP assessment workflow**
- Most recently completed story: `S1-08 - Report export for checklist, register, and summary`
- Story file: `user_stories/epics/checkpoint_vardi/done/S1-08-report-export-checklist-register-summary.md`
- Next story: `S1-10 - Browser E2E testing foundation`

Any agent changing story state must update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the
story file or folder in the same change. Invoke `$vardi-story-management`.

## Active Stage

### S1 - MVP assessment workflow

The next delivery slice is now staged as `S1-02` through `S1-08`, followed by `S1-10` as the first
browser-level proof layer and `S1-11` through `S1-16` as the follow-up hardening queue. Together
these stories move the repo from "runnable scaffold" to a teacher-deliverable assessment flow and
then into a more truthful workplace-risk-management path: seed truth, assessment data model,
assessment start, walkthrough capture, transfer into the risk register, risk scoring, summary
capture, final exports, first browser proof, mitigation planning, guided progression, explicit risk
reasoning, stronger export framing, seed-owned runtime rules, and finally a stabilized browser
regression net once the flow settles.

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
exports plus a downloadable Word/PDF bundle on the summary step. `S1-10`
follows it to add Playwright-based browser-level proof for the real MVP flow
and to capture repo-local Playwright usage guidance for future agents.
`S1-11` then introduces persisted mitigation planning on `risk_entry` rows,
`S1-12` hardens truthful progression and completion guards, `S1-13` captures
explicit saved reasoning for risk classifications, `S1-14` strengthens export
framing and metadata without overclaiming compliance status, `S1-15` lets a
small supported rule set flow from seed/runtime truth into the app, and
`S1-16` closes the queue with a later stable browser regression once those
flow-shaping slices settle. `S1-09` exists only as a narrow bridge story if a
concrete post-MVP need surfaces for broader platform groundwork.

### S0 - Foundations

`S0-01` completed the narrow baseline step: take the scaffold from "files on disk" to
"runnable empty project" without widening into feature work, schema work, or product behavior.

This baseline now gives later stories a trustworthy install, lint, typecheck, test, build, and
dev-server loop. The next staged story is `S1-10`; `S1-11` through `S1-16`
are queued behind it, while `S1-09` remains conditional and non-blocking.

## Guardrails

- Keep this file at the epic level, not the task level.
- Put implementation details in the story file, not here.
- If a story changes status, keep this file aligned with the tracker and execution plan.
- Do not seed speculative backlog items here unless the user explicitly asks for them.
