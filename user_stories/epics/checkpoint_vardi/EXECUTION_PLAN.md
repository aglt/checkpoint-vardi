# Checkpoint Vardi - Execution Plan

> Use this file to sequence real story work once stories are added.
> Start each step in a new session.
> After a story changes state, update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the story
> file together by invoking `$vardi-story-management`.

## Current State

- Active step: none in progress
- Next queued step: `S1-03`
- Most recently completed step: `S1-02`
- Most recently completed story file: `user_stories/epics/checkpoint_vardi/done/S1-02-assessment-domain-and-read-model.md`
- Next queued story file: `user_stories/epics/checkpoint_vardi/not_started/S1-03-start-assessment-from-seeded-template.md`

## S0 - Foundations

### Dependency Graph

```text
S0-01 (Runnable Empty Scaffold)
```

### Step S0-01: Foundations: runnable empty scaffold

**Agent:** Single | **Complexity:** Medium

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S0-01-foundations-scaffold.md`
**Start gate:** Closed.
**Unblocks:** The first implementation stories that depend on a runnable repo baseline.

**Completion note:**
> Verified locally on branch `chore/foundations-scaffold`: `pnpm install`, `pnpm typecheck`,
> `pnpm lint`, `pnpm lint:boundaries`, `pnpm test`, `pnpm build`, `pnpm dev` with a successful
> `http://localhost:3000` check, the story codename scan, the stricter legacy-name scan, and
> `git status`. This session used `node v25.6.1` because no Node 22 manager was available in the
> local shell; Node 22 remains the declared repo contract, but was not directly re-verified here.

## S1 - MVP assessment workflow

### Dependency Graph

```text
S0-01 -> S1-01 -> S1-02 -> S1-03 -> S1-04 -> S1-05 -> S1-06 -> S1-07 -> S1-08
                 \
                  -> S1-09 (only if a concrete S1 story needs narrow groundwork)
```

### Step S1-01: Seed catalog foundation for assessment runtime

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-01-seed-catalog-foundation.md`
**Start gate:** Closed.
**Unblocks:** `S1-02` through `S1-08` by establishing canonical seed runtime truth.

**Completion note:**
> Verified locally on branch `feat/checklists-seed-catalog-foundation`: preserved
> the normalized seed JSON baseline, added the `@vardi/checklists` runtime seam
> as the only supported package read boundary, added fail-fast runtime
> integrity tests for manifest drift and catalog mismatch, and ran
> `pnpm test`, `pnpm typecheck`, and `pnpm lint`. This session used
> `node v25.6.1` because no Node 22 manager was available in the local shell;
> Node 22 remains the declared repo contract, but was not directly
> re-verified here. Open PR: `#3`.

### Step S1-02: Assessment domain and read model

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-02-assessment-domain-and-read-model.md`
**Start gate:** Closed.
**Unblocks:** `S1-03` and the persisted assessment flow.

**Completion note:**
> Verified locally on branch `feat/assessment-domain-read-model`: added the
> first persisted assessment slice in `packages/db` with a replayable SQLite
> migration, owner-scoped aggregate loading, unique constraints for response,
> risk-entry, and summary rows, and an app-owned
> `loadAssessmentReadModel` seam that composes persisted state with
> `@vardi/checklists` seeded runtime data. The read seam preserves seeded
> walkthrough order, defaults missing responses to `unanswered`, keeps summary
> and risk-entry status as presence-only flags, and fails deterministically on
> checklist tuple drift, orphaned criterion ids, and missing risk matrix ids.
> Ran `pnpm test`, `pnpm typecheck`, and `pnpm lint`. This session used
> `node v25.6.1` because no Node 22 manager was available in the local shell;
> Node 22 remains the declared repo contract, but was not directly re-verified
> here.

### Step S1-03: Start assessment from seeded template

**Status:** Not started.
**Story file:** `user_stories/epics/checkpoint_vardi/not_started/S1-03-start-assessment-from-seeded-template.md`
**Start gate:** Open after `S1-01` and `S1-02` are complete.
**Unblocks:** `S1-04` by materializing runnable assessment instances.

### Step S1-04: Assessment walkthrough form slice

**Status:** Not started.
**Story file:** `user_stories/epics/checkpoint_vardi/not_started/S1-04-assessment-walkthrough-form-slice.md`
**Start gate:** Closed until `S1-03` is complete.
**Unblocks:** `S1-05` by capturing persisted walkthrough answers and findings.

### Step S1-05: Transfer non-compliant findings into risk register

**Status:** Not started.
**Story file:** `user_stories/epics/checkpoint_vardi/not_started/S1-05-transfer-noncompliant-findings-into-risk-register.md`
**Start gate:** Closed until `S1-04` is complete.
**Unblocks:** `S1-06` by creating structured risk-entry rows.

### Step S1-06: Risk classification engine and risk-entry editing

**Status:** Not started.
**Story file:** `user_stories/epics/checkpoint_vardi/not_started/S1-06-risk-classification-engine-and-editing.md`
**Start gate:** Closed until `S1-01` and `S1-05` are complete.
**Unblocks:** `S1-07` by making risk entries editable and classifiable.

### Step S1-07: Summary form and export readiness

**Status:** Not started.
**Story file:** `user_stories/epics/checkpoint_vardi/not_started/S1-07-summary-form-and-export-readiness.md`
**Start gate:** Closed until `S1-06` is complete.
**Unblocks:** `S1-08` by defining when an assessment is export-ready.

### Step S1-08: Report export for checklist, register, and summary

**Status:** Not started.
**Story file:** `user_stories/epics/checkpoint_vardi/not_started/S1-08-report-export-checklist-register-summary.md`
**Start gate:** Closed until `S1-07` is complete.
**Unblocks:** The assignment-ready MVP deliverable path.

### Step S1-09: Foundation for broader safety-plan modules

**Status:** Not started.
**Story file:** `user_stories/epics/checkpoint_vardi/not_started/S1-09-foundation-for-broader-safety-plan-modules.md`
**Start gate:** Closed unless an active S1 story exposes a concrete need for narrow groundwork.
**Unblocks:** Only the smallest required future expansion seams; it must remain non-blocking for the MVP flow.
