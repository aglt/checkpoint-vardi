# Checkpoint Vardi - Execution Plan

> Use this file to sequence real story work once stories are added.
> Start each step in a new session.
> After a story changes state, update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the story
> file together by invoking `$vardi-story-management`.

## Current State

- Active step: `S0-01`
- Active story file: `user_stories/epics/checkpoint_vardi/not_started/S0-01-foundations-scaffold.md`

## S0 - Foundations

### Dependency Graph

```text
S0-01 (Runnable Empty Scaffold)
```

### Step S0-01: Foundations: runnable empty scaffold

**Agent:** Single | **Complexity:** Medium

**Status:** Not started.
**Story file:** `user_stories/epics/checkpoint_vardi/not_started/S0-01-foundations-scaffold.md`
**Start gate:** Ready.
**Unblocks:** The first implementation stories that depend on a runnable repo baseline.

**Prompt:**
> Implement `S0-01` from `user_stories/epics/checkpoint_vardi/not_started/S0-01-foundations-scaffold.md`.
>
> Read `AGENTS.md`, `CLAUDE.md`, and `docs/ARCHITECTURE_BOUNDARIES.md` first.
>
> Keep scope to tooling, scripts, lockfile, typecheck, lint, test, build, and dev-server baseline
> work only. Do not widen the story into schema, UI, feature, or product implementation.
>
> Invoke `$vardi-story-management` for any story-state updates. Use the relevant local skills for
> architecture, tests, and frontend verification as needed.
>
> Verify the commands listed in the story and leave the repo in a clean state.
