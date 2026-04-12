# S1-11 - Risk mitigation planning on risk entries

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P1

Role: **Implementation source of truth** for persisted mitigation and action planning on risk entries.  
Depends on: S1-08

---

## Context

This story is complete. `S1-08` completed the teacher-deliverable MVP
path: walkthrough, transfer, risk classification, summary, and export
all run on persisted assessment truth. `S1-11` now extends that flow so
the risk register can hold persisted mitigation planning owned by
`risk_entry`, render it deterministically inside the existing in-flow
editor, and include only saved mitigation truth in exported output.

Mitigation actions now live in the new `risk_mitigation_action` child
table in `packages/db`, keyed by `riskEntryId` and `ownerId`, with
owner-scoped create/update/delete helpers and aggregate loading. The app
keeps export shaping in `apps/web`, uses a dedicated risk-register
projection seam instead of widening `loadAssessmentReadModel`, and
renders inline mitigation create/edit/delete controls on each risk-entry
card.

This slice stayed deliberately narrow: persisted actions, explicit
validation, deterministic ordering, in-flow editing, and truthful export
mapping. Reminders, notifications, attachments, and cross-assessment
action dashboards remain out of scope.

## Goal

Let users define concrete mitigation actions for each persisted risk
entry so the assessment produces an actionable plan, not only a
classification result.

## Scope

- Add an app-owned mitigation action model attached to `risk_entry`.
- Add persistence, migrations, and owner-scoped access for mitigation
  actions.
- Add app-owned mutation seams for create, edit, and delete.
- Add any dedicated projection or read seam needed to render risk-entry
  actions without overloading `loadAssessmentReadModel`.
- Add inline web UI for create/edit/delete inside the existing
  risk-entry flow.
- Extend app-owned export mapping so persisted mitigation actions are
  included deterministically in exported risk-register/report output.

### Data contract

Each mitigation action must include at minimum:

- `id`
- `riskEntryId`
- `ownerId`
- `description`
- `assigneeName` or equivalent free-text responsible-party field
- `dueDate`
- `status`
- `createdAt`
- `updatedAt`

Initial status set:

- `open`
- `inProgress`
- `done`

### Product rules

- mitigation actions belong to `risk_entry`, not directly to `finding`
- every mitigation action is user-owned and must carry `ownerId`
- export and readiness logic must use persisted action state only
- unsaved client edits never count as action-plan truth
- ordering must be deterministic
- deleting a risk entry must define explicit child-action behavior
- unresolved legal refs remain code-only linkage; mitigation actions must
  not invent authoritative legal wording

## Acceptance Criteria

- Given a persisted `risk_entry`, when a mitigation action is created,
  then it is stored as a child of that `risk_entry` with stable ids and
  owner-scoped access.
- Given an existing mitigation action, when the user edits description,
  responsible party, due date, or status, then the changes persist and
  subsequent reads return the updated values.
- Given an existing mitigation action, when the user deletes it, then it
  is removed deterministically and no orphaned state remains.
- Given a risk entry in the in-flow editor, mitigation actions render in
  a dedicated section with clear inline create/edit/delete behavior.
- Given multiple mitigation actions, they render in deterministic order.
- Given validation failure, the user sees field-level or otherwise local
  actionable feedback.
- Given persisted mitigation actions, export mapping includes them
  deterministically in the exported output.
- Given unsaved client placeholder values, export readiness does not
  count them as saved action-plan truth.

## Architecture Notes

- Do not overload `loadAssessmentReadModel`.
- If action rendering needs a dedicated projection, add it intentionally
  under the app-owned assessment/risk-entry seam.
- Keep package boundaries strict: shared packages do not import each
  other, app remains the composition root, and export stays rendering
  only.
- Domain-to-export mapping stays app-owned; `@vardi/export` consumes
  already-shaped action data.

## Validation And Tests

- DB persistence tests
- mutation tests
- projection/read-seam tests
- export-mapping tests
- UI interaction tests where practical

Minimum validation for MVP:

- description required
- status required
- due date optional unless product truth changes explicitly later
- responsible-party field optional unless product truth changes
  explicitly later

Validation completed locally with `pnpm test`, `pnpm typecheck`, and
`pnpm lint`. This session used `node v25.6.1`; Node 22 remains the
declared repo contract, but was not directly re-verified in this shell.

## Notes For Later Stories

- Reminder flows, notifications, recurring actions, attachments, comment
  threads, and broader action dashboards remain out of scope after this
  slice.
- `S1-12` can consume persisted mitigation truth if progression rules
  need to reflect action-planning completion later.
- `S1-15` may later allow runtime rules to require mitigation for
  specific risk levels; this story should not hardcode that policy.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project
  skill that is helpful for this story.
- Apply `vardi-web-architecture` and `vardi-web-data-boundary` before
  widening persistence or read seams.
- Apply `vardi-web-error-handling`, `vardi-web-hooks`, and
  `vardi-web-unit-testing` as needed for mutation UX and regression
  coverage.
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
