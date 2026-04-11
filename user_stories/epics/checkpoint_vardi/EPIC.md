# EPIC: Checkpoint Vardi

## Purpose

This file is the high-level container for the local story system. It should describe the active
epic's scope, guardrails, and sequencing once real stories are added.

## Current State

- the story system exists locally under `user_stories/`
- no implementation stories have been added to this epic yet
- the maintenance workflow is defined by `$vardi-story-management`

## How To Use This Epic

When the first real story is created:

1. add the story markdown file to `not_started/`
2. add the matching row in `TRACKER.md`
3. add the matching execution step in `EXECUTION_PLAN.md`
4. summarize the phase, dependencies, or guardrails here

Any agent changing story state must update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the
story file or folder in the same change. Invoke `$vardi-story-management`.

## Guardrails

- Keep this file at the epic level, not the task level.
- Put implementation details in the story file, not here.
- If a story changes status, keep this file aligned with the tracker and execution plan.
- Do not seed speculative backlog items here unless the user explicitly asks for them.
