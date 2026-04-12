# S1-12 - Guided assessment progression and completion guards

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P1

Role: **Implementation source of truth** for truthful step progression and persisted completion guards.  
Depends on: S1-11

---

## Context

This story is complete. The assessment page now uses a dedicated
app-owned progression projection to derive walkthrough, risk-register,
summary, and export status from persisted assessment truth only. The
projection stays structural and reviewable: it returns step completion,
availability, blocker codes, counts, and export readiness without taking
ownership of presentation copy.

The UI now consumes that projection as the single workflow owner for
guided navigation, persisted progress indicators, and blocked-state
messaging. Later steps remain visible, but they become blocked as the
next guided step when an earlier persisted prerequisite reopens.
Unsaved walkthrough drafts, unsaved summary defaults, and local client
state never unlock downstream steps or export.

## Goal

Guide users through the assessment in a clear truthful sequence so they
cannot accidentally treat incomplete persisted state as finished work.

## Scope

- Add an app-owned progression/completion service or equivalent use-case
  layer.
- Expose explicit per-step status for:
  - walkthrough
  - risk register
  - summary
  - export
- Add navigation rules and incomplete-state messaging that reflect
  persisted truth.
- Add persisted-state-derived progress indicators to the assessment UI.
- Keep the implementation limited to truthful progression and completion
  guards; avoid major IA redesign.

### Product rules

- walkthrough completion derives from persisted criterion responses only
- risk-register completion derives from persisted transferred and
  classified risk-entry truth only
- summary completion derives from persisted summary data only
- export readiness remains derived from persisted state only
- unsaved client defaults or local UI drafts must never unlock
  downstream steps
- structural normalization must not silently change behavior

## Acceptance Criteria

- Given unsaved walkthrough edits, when the user navigates elsewhere,
  downstream completion does not treat those edits as truth.
- Given unsaved summary defaults, when the export area is shown, export
  readiness remains false until the summary is saved.
- Given transferred findings but incomplete risk classification, the
  assessment does not present as ready for export.
- Given an incomplete prior step, when the user opens a later step, the
  app may allow viewing but clearly communicates incomplete
  prerequisites and does not falsely signal completion.
- Given a completed prior step, advancing feels guided and legible
  rather than arbitrary.
- The current step, incomplete sections, and blocking reasons are all
  obvious and concrete to the user.

## Architecture Notes

- Avoid turning `loadAssessmentReadModel` into a mega-read-model.
- Use dedicated projections where needed.
- Completion/readiness ownership must be singular and reviewable.
- UI consumes explicit completion state instead of re-deriving scattered
  rules client-side.
- Story docs, implementation, and user-facing gating language must
  agree.

## Validation And Tests

- progression rule tests
- readiness gating tests
- summary-unsaved-default regression tests
- UI tests for blocked and allowed states plus clear messaging

## Notes For Later Stories

- `S1-13` may extend the same completion owner if justification becomes
  required for certain saves or readiness states.
- `S1-15` may later make some requirements seed-driven; this story
  should centralize the progression owner so those later rules have one
  place to plug in.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project
  skill that is helpful for this story.
- Apply `vardi-web-architecture` before creating a new progression or
  completion owner seam.
- Apply `vardi-web-data-boundary`, `vardi-web-error-handling`,
  `vardi-web-hooks`, and `vardi-web-unit-testing` as relevant.
- Keep the implementation inside the scope of this story. Do not
  silently widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a
  draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect
  the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and
  ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
