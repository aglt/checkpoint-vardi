# EPIC: Checkpoint Vardi

## Purpose

This file is the high-level container for the local story system. It should describe the active
epic's scope, guardrails, and sequencing once real stories are added.

## Current State

- the story system exists locally under `user_stories/`
- the first implementation story is now staged under `not_started/`
- the maintenance workflow is defined by `$vardi-story-management`

## How To Use This Epic

The active stage is currently:

- **S0 - Foundations**
- Active story: `S0-01 - Foundations: runnable empty scaffold`
- Story file: `user_stories/epics/checkpoint_vardi/not_started/S0-01-foundations-scaffold.md`

Any agent changing story state must update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the
story file or folder in the same change. Invoke `$vardi-story-management`.

## Active Stage

### S0 - Foundations

The current first story is intentionally narrow: take the scaffold from "files on disk" to
"runnable empty project" without widening into feature work, schema work, or product behavior.

This is the baseline step that lets later stories start from a trustworthy install, lint,
typecheck, test, build, and dev-server loop.

## Guardrails

- Keep this file at the epic level, not the task level.
- Put implementation details in the story file, not here.
- If a story changes status, keep this file aligned with the tracker and execution plan.
- Do not seed speculative backlog items here unless the user explicitly asks for them.
