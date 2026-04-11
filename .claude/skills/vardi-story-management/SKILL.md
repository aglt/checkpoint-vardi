---
name: vardi-story-management
description: Keep epic trackers, execution plans, and story folders synchronized whenever story state changes or new stories are added. Use when editing files under `user_stories/epics/*`, moving story files between `not_started/` and `done/`, updating `TRACKER.md`, `EXECUTION_PLAN.md`, or `EPIC.md`, or scaffolding a new epic.
---

# Vardi Story Management

Use this skill whenever work touches the local story system.

## Apply it when

- adding a new epic
- adding, renaming, or rewriting a story file
- moving a story between `not_started/` and `done/`
- changing status wording, dependency gates, or next-up text
- updating prompt blocks in `EXECUTION_PLAN.md`

## Workflow

1. Confirm the real story state first.

- Do not mark a story done until it is actually done by the repo's current convention.
- If the work is still under review, keep the wording temporally accurate.

2. Update the story file first.

- Keep the status line, dependencies, acceptance criteria, and key files current.
- Treat the story file as the implementation source of truth.

3. Update all companion docs in the same change.

- `TRACKER.md`
- `EXECUTION_PLAN.md`
- `EPIC.md`
- any path references affected by a folder move

4. Recompute sequencing text.

- update dependency gates
- update "Next up" bullets
- update any prompt that still points to the old path or status

5. Re-read the touched docs together.

- the folder, tracker row, execution step, and epic summary should tell the same story

## New Epic Scaffold

When creating a new epic, include:

- `EPIC.md`
- `TRACKER.md`
- `EXECUTION_PLAN.md`
- `not_started/`
- `done/`
- `reference/`

Do not create extra process docs unless the user asks for them.

## Guardrails

- Status changes are atomic across docs.
- Reuse the repo's existing folder and status vocabulary.
- Keep prompts actionable and scoped.
- Do not leave stale file paths behind after renames or moves.
- If a story changes status, update the "Next up" section before finishing.

## Required Output

- current story-state summary
- files changed to keep the tracker consistent
- the next logical story, if one exists

## Checklist

- story header matches reality
- story folder matches reality
- tracker row matches reality
- execution plan step matches reality
- epic summary matches reality
- next-up text matches reality
- stale paths were checked
