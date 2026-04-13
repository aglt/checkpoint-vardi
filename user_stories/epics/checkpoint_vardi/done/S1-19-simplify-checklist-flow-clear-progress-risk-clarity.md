# S1-19 - Simplify checklist flow with clear progress and risk clarity

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P1

Role: **Implementation source of truth** for reducing walkthrough cognitive load while keeping progress, blocking truth, and risk attention explicit.  
Depends on: S1-12, S1-15, S1-16, S1-18

---

## Context

This story is complete. Because `frontend-design` was not available locally,
implementation used `.claude/skills/modern-premium-web/SKILL.md` as the
repo-local equivalent for the walkthrough UX contract. The walkthrough now
keeps one dominant item on screen, auto-saves answer/comment/severity changes,
persists a narrow walkthrough-owned attention severity on `finding`, and keeps
progress plus blocker truth aligned with valid saved completion instead of
mixed draft-state counters. Verification ran locally with `pnpm test`,
`pnpm typecheck`, `pnpm lint`, and `pnpm test:e2e` under `node v25.6.1`; the
repo contract still declares Node 22.

The current assessment walkthrough already has truthful persisted progression
from `S1-12`, seed-driven workflow rules from `S1-15`, the stable browser proof
added in `S1-16`, named severity choices in the risk register from `S1-18`,
and the later walkthrough-shell follow-up merged in PR `#22`. That later
follow-up moved the page toward one focused criterion at a time, but the active
flow still spreads attention across repeated counters, multiple navigation
surfaces, status cards, and a risk-attention model that remains too implicit
until later in the assessment.

This story is the next stabilizing slice after `S1-16` closed the current
browser-proof queue for the settled flow on `main`. Its job is not to redesign
information architecture or widen into export work. It should tighten the
active checklist walkthrough so the user experience feels like a single obvious
loop: answer, see truthful save state, move to the next item, and understand
immediately whether anything still needs attention before export.

## Goal

Refactor the current walkthrough into a one-item-at-a-time assessment flow with
strong progress visibility, explicit blocking truth, and clearer risk signaling
when an item is not OK.

## Scope

- Keep the current assessment route and overall stage structure intact.
- Refactor the walkthrough UI so one checklist item is dominant at a time.
- Make progress legible through one global indicator and one per-chapter
  indicator.
- Make blocking and missing work explicit, especially before export.
- Reveal required risk severity only when the answer is `notOk`.
- Keep persistence, export behavior, and broader IA stable unless a narrow
  walkthrough-owned data addition is truly required for severity capture.

### Owner directories

- `apps/web/app/assessments/[assessmentId]/_components`
- `apps/web/lib/assessments`
- `apps/web/lib/i18n`
- `packages/schemas` only if the walkthrough input contract must widen
- `packages/db` only if no existing persisted seam can truthfully store the
  required walkthrough severity

### Implementation requirement

- MUST use the `frontend-design` skill for all UI and UX decisions.
- If `frontend-design` is still unavailable locally at implementation time,
  stop and resolve the designated repo-local equivalent before proceeding; do
  not invent ad hoc UI patterns.
- Do not mirror backend structure in the UI.
- Optimize for user flow, clarity, and low cognitive load.

### Product rules

- The user must never see more than one checklist item input at once.
- The primary path must stay `Answer -> Next`.
- There is no manual save step; answer, comment, and severity changes auto-save.
- Progress counts must not be duplicated across multiple competing surfaces.
- `notOk` must surface as attention-worthy at the item, chapter, and global
  level.
- Risk severity is required only when `notOk` is selected; comment remains
  optional.
- No IA redesign, no export changes, and no broad data-model remodel.
- If a backend change is needed, keep it limited to the smallest truthful
  severity field addition.

## Out of scope

- redesigning the overall assessment information architecture
- changing export documents or export readiness semantics unrelated to
  walkthrough clarity
- widening the risk-register editor beyond what this walkthrough flow requires
- speculative schema cleanup unrelated to the narrow severity need

## Acceptance Criteria

- Given the walkthrough step, the page shows exactly one checklist item input
  at a time and the clear primary flow is `Answer -> Next`.
- Given an answered item, the UI auto-saves, shows truthful `Saving...` and
  `Saved` feedback, and enables the primary next action without a manual save
  button.
- Given the current assessment state, the top bar shows one global progress bar
  with a single completed count and the left panel shows one per-chapter status
  plus `x / y completed`; duplicate counters and vague helper text are removed.
- Given unanswered or blocking work, the walkthrough makes missing state
  explicit through `Complete`, `Needs attention`, and `Not answered` signals,
  and the next-step or export CTA explains why it is disabled.
- Given a `notOk` answer, the UI reveals an inline required severity choice of
  `Small`, `Medium`, or `Large`, keeps the comment optional, and does not allow
  forward progression until severity is chosen.
- Given chapter navigation use, clicking a chapter jumps to the first
  incomplete item in that chapter and supports recovery without duplicating the
  main flow.
- Given the existing browser proof from `S1-16`, the simplified walkthrough
  surface is stable enough to refresh that regression without brittle test-only
  accommodations.

## Architecture Notes

- Keep walkthrough flow ownership singular and app-owned; do not spread status
  rules across multiple client-only helpers.
- Reuse the progression projection from `S1-12` where possible instead of
  re-deriving blocking truth ad hoc in components.
- Reuse the existing app-language seam and keep localized strings in
  `apps/web/lib/i18n/`.
- If walkthrough-level severity must persist before risk-register transfer,
  make that seam explicit and narrow rather than smuggling risk state through
  UI-only drafts.
- Any refresh to the existing `S1-16` browser proof should consume the
  stabilized result of this story rather than preserving the older walkthrough
  shell.

## Validation And Tests

- targeted walkthrough controller tests for one-item sequencing, autosave
  transitions, and next-action enabling
- progression or projection tests for chapter status, needs-attention counts,
  and blocking messaging
- render or integration tests for inline severity disclosure and disabled
  next or export states
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:e2e` if the visible walkthrough flow changes materially

## Key Files

- `apps/web/app/assessments/[assessmentId]/_components/AssessmentWalkthrough.tsx`
- `apps/web/lib/assessments/assessmentWalkthroughController.ts`
- `apps/web/lib/assessments/loadAssessmentProgressionProjection.ts`
- `apps/web/lib/assessments/saveAssessmentCriterionResponse.ts`
- `apps/web/lib/i18n/mvpCopy.ts`
- `packages/schemas/src/index.ts`
- `packages/db/src/schema.ts`

## Notes For Later Stories

- Any later refresh to the existing `S1-16` browser regression should update
  selectors and flow expectations to this simplified walkthrough shell.
- If the walkthrough severity requirement uncovers a separate risk-domain model
  question, stop and create a narrower follow-up instead of widening this story
  silently.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill
  that is helpful for this story.
- Apply `vardi-web-architecture`, `vardi-web-hooks`,
  `vardi-web-error-handling`, and `vardi-web-unit-testing` as relevant.
- Apply the designated frontend design skill before changing user-facing layout
  or interaction patterns.
- Keep the implementation inside the scope of this story. Do not silently widen
  scope.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the new
  truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready
  for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
