# S1-03 - Start assessment from seeded template

> **Status: DONE**
> **Stage:** S1 - MVP assessment workflow
> **Epic:** Checkpoint Vardi - Stage One assessment workflow
> **Priority:** P0

Role: **Implementation source of truth** for assessment initialization from seeded templates.  
Depends on: S1-01, S1-02

---

## Context

This story is complete. The repo now has a narrow seeded-assessment start flow
without widening into walkthrough editing or broader shell architecture. `/` is
currently the MVP start entry route only. It creates a `workplace` context,
selects one of the seeded woodworking or construction templates from
`@vardi/checklists`, and starts an assessment pinned to the seeded checklist
tuple and the fixed `course-3x3` risk matrix.

The write complexity stays in the intended owner seams. `packages/schemas` owns
the request and response contract for assessment start. `packages/db` owns the
transactional `createWorkplaceAssessment` write helper that inserts the
`workplace`, `risk_assessment`, and the initial `finding` rows in one
transaction. The initial response rows are materialized exactly once from the
flattened seeded section and criterion order, while still binding runtime truth
to stable seeded `criterionId` values.

`apps/web/lib/assessments/startAssessmentFromSeededTemplate` is the only
app-owned composition seam for startup writes. It resolves the seeded checklist,
resolves the fixed matrix, flattens criterion ids in seeded order, and calls the
DB helper. `apps/web/app/api/assessments/route.ts` stays thin: it validates
input, resolves the placeholder owner, calls the write seam, and redirects the
form-start flow. S1-03 intentionally keeps submit behavior as a plain form POST
entry seam rather than introducing a separate typed client fetch path before
walkthrough work exists.

`/assessments/[assessmentId]` now exists only as a post-create readiness page.
It loads through the existing `loadAssessmentReadModel` seam via a narrow
readiness helper and renders only workplace name, pinned checklist title,
matrix title, section count, and criterion count. It intentionally does not
render criteria, answers, transfer controls, or walkthrough affordances. Those
remain in scope for `S1-04` and later stories.

This completion was verified locally with `pnpm test`, `pnpm typecheck`, and
`pnpm lint`. `pnpm-workspace.yaml` now explicitly allows the `better-sqlite3`
install script so the native binding is built during normal workspace install.
This session used `node v25.6.1`; Node 22 remains the declared repo contract,
but that exact runtime was not available in this shell during this session.

## Goal

Allow a user to create or start an assessment from one of the seeded checklists.

## Scope

- Add the flow to choose the assessment context and checklist template.
- Use the seeded checklist catalog as the source of available templates.
- Start a new assessment from a chosen checklist.
- Materialize the initial runtime state so the walkthrough can begin immediately.
- Freeze enough template identity and version data onto the assessment so exports later remain consistent.

## Acceptance Criteria

- User can start an assessment from seeded checklist data.
- The seeded woodworking and construction checklists are available as startable templates.
- Starting an assessment creates the necessary persisted runtime records.
- A fresh assessment is ready for walkthrough without manual setup.
- No full walkthrough editing yet beyond initialization.

## Notes For Later Stories

- `S1-04` should begin walkthrough rendering and answer capture from the seeded
  order already pinned and materialized here.
- `S1-04` must keep `/assessments/[assessmentId]` scoped to actual walkthrough
  behavior when it expands the page, rather than widening `S1-03`'s readiness
  surface retroactively.
- Matrix choice, template compatibility policy, imported templates, risk
  transfer, summary readiness, export behavior, and broader safety-plan modules
  remain out of scope until later stories explicitly take ownership.

## Execution Rules

- Start by creating a new git branch and checking it out.
- Apply any repo skill, AGENTS guidance, local conventions, or project skill that is helpful for this story.
- You must apply the `frontend-design` skill for all user-facing web work in this story, including layout, form UX, interaction states, responsive behavior, and visual hierarchy.
- Keep the implementation inside the scope of this story. Do not silently widen scope.
- After implementation, open a GitHub PR and make sure it is **not** a draft.
- If the story cannot be fully completed because of blockers, do both:
  - create a new follow-up story for the blocker or remainder
  - still open a **non-draft PR** for the work that was completed
- After merge to `main`, update the user stories and tracker to reflect the new truth.
- After merge to `main`, ensure local `main` is up to date, clean, and ready for the next story.
- Do not leave uncommitted leftovers or stale local branches behind.
