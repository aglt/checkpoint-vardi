# Checkpoint Vardi - Execution Plan

> Use this file to sequence real story work once stories are added.
> Start each step in a new session.
> After a story changes state, update `TRACKER.md`, `EXECUTION_PLAN.md`, `EPIC.md`, and the story
> file together by invoking `$vardi-story-management`.

## Current State

- Active step: none in progress
- Next queued step: `S1-09` (conditional)
- Most recently completed step: `S1-16`
- Most recently completed story file: `user_stories/epics/checkpoint_vardi/done/S1-16-stable-browser-e2e-for-end-to-end-assessment-to-export-flow.md`
- Next queued story file: `user_stories/epics/checkpoint_vardi/not_started/S1-09-foundation-for-broader-safety-plan-modules.md`

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
S1-08 -> S1-10 -> S1-16
S1-08 -> S1-11 -> S1-12 -> S1-13 -> S1-14 -> S1-15 -> S1-16
S1-08 -> S1-17
S1-08 -> S1-18
S1-08 -> S1-09 (only if a concrete S1 story needs narrow groundwork)
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
> re-verified here. PR: `#3`.

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
> here. PR: `#4`.

### Step S1-03: Start assessment from seeded template

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-03-start-assessment-from-seeded-template.md`
**Start gate:** Closed.
**Unblocks:** `S1-04` by materializing runnable assessment instances.

**Completion note:**
> Verified locally on branch `feat/assessment-start-seeded-template`: added the
> typed assessment-start contract in `@vardi/schemas`, the transactional
> `createWorkplaceAssessment` write helper in `packages/db`, the app-owned
> start-assessment composition seam, a guarded app SQLite bootstrap plus fixed
> placeholder owner seam, the current MVP start entry route at `/`, the thin
> `POST /api/assessments` route, and the read-only assessment readiness page.
> Assessment creation now pins the full seeded checklist tuple and fixed
> `course-3x3` matrix id, then materializes one unanswered persisted finding
> row per seeded criterion in the flattened seeded order. Ran `pnpm test`,
> `pnpm typecheck`, and `pnpm lint`. This session used `node v25.6.1`; Node 22
> remains the declared repo contract, but was not directly re-verified here.
> PR: `#5`.

### Step S1-04: Assessment walkthrough form slice

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-04-assessment-walkthrough-form-slice.md`
**Start gate:** Closed.
**Unblocks:** `S1-05` by capturing persisted walkthrough answers and findings.

**Completion note:**
> Verified locally on branch `codex/s1-04-assessment-walkthrough-form-slice`:
> expanded `/assessments/[assessmentId]` from readiness-only into the seeded
> walkthrough form slice, added the narrow owner-scoped finding update seam in
> `packages/db`, added the narrow server-action walkthrough save boundary plus
> a deterministic app mutation helper, extracted the client save-state
> controller into a targeted tested module, and now persist criterion answers
> and notes against stable seeded `criterionId` values so refresh resumes the
> current walkthrough state.
> Ran `pnpm test`, `pnpm typecheck`, and `pnpm lint` after installing workspace
> dependencies in this worktree. This session used `node v25.6.1`; Node 22
> remains the declared repo contract, but was not directly re-verified here.
> PR: `#6`.

### Step S1-05: Transfer non-compliant findings into risk register

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-05-transfer-noncompliant-findings-into-risk-register.md`
**Start gate:** Closed.
**Unblocks:** `S1-06` by creating structured risk-entry rows.

**Completion note:**
> Verified locally on branch `codex/s1-05-transfer-noncompliant-findings-into-risk-register`:
> added the typed Step `1b` transfer contract, the transactional owner-scoped
> DB transfer seam in `packages/db`, the narrow app helper plus server action,
> and a minimal walkthrough trigger that promotes persisted `notOk` findings
> into `risk_entry` rows using seeded criterion titles as the initial hazard.
> Re-running transfer now pre-filters existing rows by `findingId`, relies on
> the existing unique DB constraint as the final guardrail, and preserves
> traceability through `risk_entry.findingId -> finding.criterionId` without
> widening into risk scoring or editing.
> Ran `pnpm test`, `pnpm typecheck`, and `pnpm lint` after installing
> workspace dependencies in this worktree. This session used `node v25.6.1`;
> Node 22 remains the declared repo contract, but was not directly re-verified
> here. PR: `#7`.

### Step S1-06: Risk classification engine and risk-entry editing

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-06-risk-classification-engine-and-editing.md`
**Start gate:** Closed.
**Unblocks:** `S1-07` by making risk entries editable and classifiable.

**Completion note:**
> Verified locally on branch `feat/assessment-risk-entry-editing`: added the
> pure `@vardi/risk` classifier and deterministic matrix tests, added the
> strict risk-entry save contract plus the owner-scoped transferred-row update
> seam, kept `loadAssessmentReadModel` walkthrough-centric, added a separate
> app-owned risk-register projection plus targeted save-context resolver, and
> split the page into separate walkthrough and risk-register UI owners on
> `/assessments/[assessmentId]`. Risk-entry saves now resolve only the target
> transferred row plus the pinned seeded matrix, derive `riskLevel` on the
> server, and localize stale persisted classifications to the affected
> risk-entry cards instead of failing the full page.
> Ran `pnpm test`, `pnpm typecheck`, and `pnpm lint` after installing
> workspace dependencies in this worktree. This session used `node v25.6.1`;
> Node 22 remains the declared repo contract, but was not directly re-verified
> here. Merged to `main` via PR: `#8`.

### Step S1-07: Summary form and export readiness

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-07-summary-form-and-export-readiness.md`
**Start gate:** Closed.
**Unblocks:** `S1-08` by defining when an assessment is export-ready.

**Completion note:**
> Verified locally on branch `feat/assessment-summary-export-readiness`:
> added the narrow owner-scoped summary upsert seam in `packages/db`, added
> the strict summary save contract and nested export-readiness response shape
> in `@vardi/schemas`, added a separate app-owned summary projection plus save
> boundary in `apps/web/lib/assessments`, and split the assessment page into a
> third focused summary/readiness surface below the risk register. Export
> readiness is now derived on the server from persisted walkthrough answers,
> transferred risk rows, verified classifications, and required saved summary
> fields, while `loadAssessmentReadModel` stays walkthrough-centric and
> export rendering remains out of scope for this slice.
> Ran `pnpm test`, `pnpm typecheck`, and `pnpm lint` after installing
> workspace dependencies in this worktree. This session used `node v25.6.1`;
> Node 22 remains the declared repo contract, but was not directly re-verified
> here. Merged to `main` via PR: `#9`.

### Step S1-08: Report export for checklist, register, and summary

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-08-report-export-checklist-register-summary.md`
**Start gate:** Closed.
**Unblocks:** The assignment-ready MVP deliverable path.

**Completion note:**
> Verified locally on branch `feat/assessment-report-export`: added the
> strict export-trigger contract and bundle response shape in
> `@vardi/schemas`, implemented package-owned Word/PDF rendering plus zip
> bundling in `@vardi/export`, added the app-owned assessment export
> mapping seam without widening `loadAssessmentReadModel`, and wired a
> summary-surface download CTA that only generates exports from persisted
> export-ready state. Checklist export now preserves seeded section and
> criterion order, register export stays aligned with transferred and
> evaluated risk entries, and summary export stays aligned with the
> persisted step-6 summary row.
> Ran `pnpm test`, `pnpm typecheck`, and `pnpm lint`. This session used
> `node v25.6.1`; Node 22 remains the declared repo contract, but was not
> directly re-verified here. PR: `#10`.

### Step S1-10: Browser E2E foundation and blocked-readiness baseline

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-10-browser-e2e-testing-foundation.md`
**Start gate:** Closed.
**Unblocks:** Truthful browser-level smoke and blocked-readiness regression coverage plus the later stable browser assessment-to-export flow in `S1-16`.

**Completion note:**
> Verified locally on branch `codex/s1-10-browser-e2e-foundation`: added
> Playwright as the narrow repo-local browser E2E baseline, added the root
> `pnpm test:e2e` entrypoint, added an isolated SQLite bootstrap/reset seam
> under `apps/web/e2e/` using `VARDI_DATABASE_PATH`, added a smoke spec for
> `/` boot plus seeded templates, added a blocked-readiness workflow spec that
> covers walkthrough save, transfer, risk-entry save, summary save, and the
> current blocked export-readiness truth, and updated the repo-local
> `vardi-web-e2e-testing` skill guidance with exact local run/debug rules.
> This slice also fixed the assessment editors so imported server actions now
> dispatch correctly from the browser and save-state request ids no longer
> stall in `saving`, while splitting the DB package into explicit
> `@vardi/db/runtime` and `@vardi/db/testing` entrypoints so the root package
> seam stays narrower.
> Ran `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm test:e2e`. This
> session used `node v25.6.1`; Node 22 remains the declared repo contract, but
> was not directly re-verified here. PR: `#12`.

### Step S1-11: Risk mitigation planning on risk entries

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-11-risk-mitigation-planning-on-risk-entries.md`
**Start gate:** Closed.
**Unblocks:** `S1-12`, richer export/register truth, and any later runtime rule that needs mitigation state.

**Completion note:**
> Verified locally on branch `codex/s1-11-risk-mitigation-planning`:
> replaced the old row-level action planning fields with persisted
> `risk_mitigation_action` child rows owned by `risk_entry`, added
> owner-scoped DB helpers plus app-owned create/update/delete seams,
> extended the existing risk-register projection to render saved actions
> deterministically, updated the in-flow editor to manage inline
> mitigation actions separately from parent risk-entry saves, and mapped
> only saved mitigation actions into the app-owned export document
> shaping path consumed by `@vardi/export`.
> Ran `pnpm test`, `pnpm typecheck`, and `pnpm lint` after installing
> workspace dependencies in this worktree. This session used
> `node v25.6.1`; Node 22 remains the declared repo contract, but was
> not directly re-verified here. PR: `#13`.

### Step S1-12: Guided assessment progression and completion guards

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-12-guided-assessment-progression-and-completion-guards.md`
**Start gate:** Closed.
**Unblocks:** `S1-13`, later runtime-driven completion rules, and clearer server-owned gating across the assessment flow.

**Completion note:**
> Verified locally on branch `codex/s1-12-guided-assessment-progression-and-completion-guards`:
> added a dedicated app-owned `loadAssessmentProgressionProjection` seam plus a
> narrow progression reload action, kept progression output structural-only with
> step status, blocker codes, counts, and export readiness derived from
> persisted assessment truth, and wired the assessment page to consume that
> server snapshot for guided navigation, blocked-state messaging, and truthful
> progress indicators without widening `loadAssessmentReadModel`. The workflow
> now keeps later steps visible but blocked when earlier persisted prerequisites
> reopen, while unsaved walkthrough drafts, unsaved summary defaults, and local
> client state never unlock downstream steps or export. Added targeted
> progression projection, walkthrough-controller, and assessment-page tests for
> blocked/allowed states, reopened-step regressions, orphaned transferred rows,
> and unsaved-default behavior. Ran `pnpm test`, `pnpm typecheck`, and
> `pnpm lint` after installing workspace dependencies in this worktree and
> verifying under `node v22.22.2`. PR: `#15`.

### Step S1-13: Explicit risk reasoning capture

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-13-explicit-risk-reasoning-capture.md`
**Start gate:** Closed.
**Unblocks:** `S1-14`, template-driven justification requirements, and less opaque saved risk classifications.

**Completion note:**
> Verified locally on branch
> `codex/s1-13-explicit-risk-reasoning-capture`: added one optional
> persisted `classificationReasoning` field on `risk_entry`, extended the
> existing owner-scoped DB and schema-backed risk-entry save seams, reused the
> app-owned risk-register projection and editor to capture saved reasoning
> alongside classification, and mapped only persisted reasoning into the
> app-owned register export documents consumed by `@vardi/export`. This slice
> kept progression and export-readiness rules unchanged so unsaved drafts still
> cannot unlock downstream truth and missing reasoning does not block the
> current MVP flow.
> Ran `pnpm test`, `pnpm typecheck`, and `pnpm lint` after installing
> workspace dependencies in this worktree. This session used `node v25.6.1`;
> Node 22 remains the declared repo contract, but was not directly re-verified
> here. PR: `#16`.

### Step S1-14: Compliance-oriented export framing and assessment metadata

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-14-compliance-oriented-export-framing-and-assessment-metadata.md`
**Start gate:** Closed.
**Unblocks:** `S1-15`, later stable export-facing browser verification, and more professional report framing.

**Completion note:**
> Verified locally on branch
> `codex/s1-14-compliance-oriented-export-framing`: reshaped the
> app-owned export seam into explicit assessment-record,
> workplace-context, template-provenance, and framing/provenance
> sections ahead of document-specific checklist-observation,
> risk-register/classification, mitigation-action-plan, and
> summary/priority-overview sections while keeping `@vardi/export`
> package-owned as a structured renderer only. The export bundle now
> formats persisted assessment-start timestamps deterministically in UTC,
> keeps saved summary dates date-only, separates mitigation actions from
> classification content when present, and preserves unresolved imported
> legal references as code-only linkage in both framing notes and
> criterion-level export content without inventing authoritative titles.
> Added targeted export-mapping and rendering tests for ordering,
> provenance, mitigation separation, and unresolved legal-reference
> handling, then reran validation under `node v22.22.2` with
> `pnpm --filter @vardi/export test`,
> `pnpm --filter @vardi/web exec tsx --test lib/assessments/generateAssessmentExportBundle.test.ts`,
> `pnpm test`, `pnpm typecheck`, and `pnpm lint`. PR: `#17`.

### Step S1-15: Sector/profile-specific assessment rules via seed-owned runtime extensions

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-15-sector-profile-specific-assessment-rules-via-seed-owned-runtime-extensions.md`
**Start gate:** Closed.
**Unblocks:** Sector-specific workflow behavior without scattered app conditionals, plus the final stabilized flow for `S1-16`.

**Completion note:**
> Verified locally under `node v22.22.2`: `@vardi/checklists` now validates and
> exposes a narrow `workflowRules` runtime seam with backward-compatible
> defaults, `construction-site` opts into the supported justification,
> mitigation, and summary-field rules, and `apps/web` now maps those rules once
> and evaluates them once through a dedicated app-owned workflow-rule seam that
> summary, progression, export gating, and risk-register messaging consume
> without widening `AssessmentExportReadiness`. Final validation ran with
> `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm test:e2e`. PR: `#21`.

### Step S1-16: Stable browser E2E for end-to-end assessment-to-export flow

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-16-stable-browser-e2e-for-end-to-end-assessment-to-export-flow.md`
**Start gate:** Closed.
**Unblocks:** Confident maintenance of the real persisted assessment-to-export journey on `main`.

**Completion note:**
> Verified locally on branch `codex/s1-16-stable-browser-e2e-for-end-to-end-assessment-to-export-flow` under `node v22.22.2`: kept the existing woodworking blocked-readiness browser guard, extended the settled construction-template Playwright flow through the real export trigger, and fixed a real runtime export failure by moving package-owned PDF rendering to the standalone `pdfkit` runtime so Next server bundling keeps standard-font data available during browser-triggered exports. Final validation ran with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm test:e2e`. PR: `#23`.

### Step S1-17: Language-consistent web content for the current MVP flow

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-17-language-consistent-web-content.md`
**Start gate:** Closed.
**Unblocks:** Cleaner product trust on the current web flow and future assertions that should depend on stabilized app-language copy.

**Completion note:**
> Verified locally on branch `codex/s1-17-language-consistent-web-content`:
> added a request-derived app-language seam with an explicit
> `requestAppLanguage.server.ts` boundary, moved app-owned start-page and
> assessment-flow copy into `apps/web/lib/i18n/`, kept lower assessment
> projections state-oriented by removing localized message ownership from those
> boundaries, localized presentation-only risk severity labels, and added both
> boundary regression coverage and Icelandic leakage checks for the current
> start page and assessment flow including the merged mitigation-action surface.
> Ran `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and
> `pnpm build` under `node v22.22.2`. PR: `#14`.
> A later merged follow-up in PR `#19` kept the request-derived `is`/`en`
> seam unchanged, made the `en-US` and Icelandic-fallback contract explicit in
> focused app-language tests, and reran `pnpm test`, `pnpm typecheck`, and
> `pnpm lint` under `node v22.22.2`.
> A later merged follow-up in PR `#20` then changed the live product default
> so app-owned UI stays Icelandic on every request instead of following
> browser `Accept-Language`, and reran `pnpm test`, `pnpm typecheck`, and
> `pnpm lint` under `node v22.22.2`.

### Step S1-18: Risk severity choice alignment with the reference workflow

**Status:** Completed.
**Story file:** `user_stories/epics/checkpoint_vardi/done/S1-18-risk-severity-choice-alignment.md`
**Start gate:** Closed.
**Unblocks:** A more truthful risk-severity UX on the current flow and later stable browser assertions in `S1-16`.

**Completion note:**
> Verified locally on branch `codex/s1-18-risk-severity-choice-alignment`:
> moved the screenshot-aligned severity-choice owner into the app-owned
> risk-register projection/editor seam, derived deterministic grouped
> `low | medium | high` options from the pinned matrix while keeping the exact
> saved `likelihood + consequence` pair explicit, localized severity labels to
> `Lág/Miðlungs/Há` and `Low/Medium/High`, and kept the summary priority panel
> live-aligned with the same saved `riskLevel` mapping through a narrow
> server-truthful client sync without touching export generation. Ran
> `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm test:e2e` under
> `node v22.22.2`. PR: `#18`.

### Step S1-09: Foundation for broader safety-plan modules

**Status:** Not started.
**Story file:** `user_stories/epics/checkpoint_vardi/not_started/S1-09-foundation-for-broader-safety-plan-modules.md`
**Start gate:** Closed unless the completed `S1-10` browser proof slice, the completed `S1-11` through `S1-18` follow-up flow, or another follow-up MVP need exposes a concrete requirement for narrow groundwork.
**Unblocks:** Only the smallest required future expansion seams; it must remain non-blocking for the MVP flow.
