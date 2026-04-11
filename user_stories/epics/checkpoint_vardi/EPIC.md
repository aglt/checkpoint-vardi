# EPIC: Checkpoint Vardi

## Purpose

This file is the high-level container for the local story system. It should describe the active
epic's scope, guardrails, and sequencing once real stories are added.

## Current State

- the story system exists locally under `user_stories/`
- `S0-01` is complete and now lives under `done/`
- `S1-01` through `S1-09` are now staged under `not_started/`
- the next implementation story is `S1-01`
- the maintenance workflow is defined by `$vardi-story-management`

## How To Use This Epic

The active stage is currently:

- **S1 - MVP assessment workflow**
- Most recently completed story: `S0-01 - Foundations: runnable empty scaffold`
- Story file: `user_stories/epics/checkpoint_vardi/done/S0-01-foundations-scaffold.md`
- Next story: `S1-01 - Seed catalog foundation for assessment runtime`

Any agent changing story state must update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the
story file or folder in the same change. Invoke `$vardi-story-management`.

## Active Stage

### S1 - MVP assessment workflow

The next delivery slice is now staged as `S1-01` through `S1-08`. These stories move the repo from
"runnable scaffold" to a teacher-deliverable assessment flow: seed truth, assessment data model,
assessment start, walkthrough capture, transfer into the risk register, risk scoring, summary
capture, and final exports.

`S1-01` is the immediate next story because it creates the canonical seed runtime truth that every
other S1 story depends on. `S1-09` exists as a narrow bridge story only if a concrete S1 need
surfaces for broader platform groundwork.

### S0 - Foundations

`S0-01` completed the narrow baseline step: take the scaffold from "files on disk" to
"runnable empty project" without widening into feature work, schema work, or product behavior.

This baseline now gives later stories a trustworthy install, lint, typecheck, test, build, and
dev-server loop. The next staged story is `S1-01`.

## Guardrails

- Keep this file at the epic level, not the task level.
- Put implementation details in the story file, not here.
- If a story changes status, keep this file aligned with the tracker and execution plan.
- Do not seed speculative backlog items here unless the user explicitly asks for them.
