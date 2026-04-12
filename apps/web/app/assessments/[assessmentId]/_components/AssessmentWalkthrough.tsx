"use client";

import React, { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  SaveAssessmentCriterionStatus,
  TransferAssessmentFindingsToRiskRegisterOutput,
} from "@vardi/schemas";

import {
  beginCriterionSave,
  beginRiskEntrySave,
  buildInitialCriterionRiskEntryStatus,
  buildInitialCriterionState,
  buildInitialRiskEntryState,
  canPersistRiskEntryDraft,
  getAssessmentRiskTransferProgress,
  canPersistCriterionDraft,
  getAnsweredCount,
  getAssessmentWalkthroughProgress,
  isDirty,
  isRiskEntryDirty,
  markTransferredRiskEntriesPresent,
  reconcileCriterionSaveFailure,
  reconcileCriterionSaveSuccess,
  reconcileRiskEntrySaveFailure,
  reconcileRiskEntrySaveSuccess,
  type CriterionClientState,
  type CriterionDraft,
  type CriterionRiskEntryStatusMap,
  type CriterionStateMap,
  type RiskEntryClientState,
  type RiskEntryDraft,
  type RiskEntryStateMap,
  updateCriterionDraftNotes,
  updateRiskEntryDraftField,
} from "@/lib/assessments/assessmentWalkthroughController";
import type {
  AssessmentSectionReadModel,
  PresenceStatus,
} from "@/lib/assessments/loadAssessmentReadModel";
import { saveAssessmentCriterionResponseAction } from "@/lib/assessments/saveAssessmentCriterionResponseAction";
import { saveAssessmentRiskEntryAction } from "@/lib/assessments/saveAssessmentRiskEntryAction";
import { transferAssessmentFindingsToRiskRegisterAction } from "@/lib/assessments/transferAssessmentFindingsToRiskRegisterAction";

interface AssessmentWalkthroughProps {
  readonly assessmentId: string;
  readonly workplaceName: string;
  readonly checklistTitle: string;
  readonly checklistVersion: string;
  readonly riskMatrixTitle: string;
  readonly riskMatrixLikelihoodLevels: number;
  readonly riskMatrixConsequenceLevels: number;
  readonly sections: readonly AssessmentSectionReadModel[];
}

const ANSWER_OPTIONS: ReadonlyArray<{
  readonly value: SaveAssessmentCriterionStatus;
  readonly label: string;
  readonly description: string;
}> = [
  {
    value: "ok",
    label: "Ok",
    description: "Meets the current expectation.",
  },
  {
    value: "notOk",
    label: "Not ok",
    description: "Needs follow-up in a later story.",
  },
  {
    value: "notApplicable",
    label: "Not applicable",
    description: "Does not apply in this context.",
  },
] as const;

export function AssessmentWalkthrough({
  assessmentId,
  workplaceName,
  checklistTitle,
  checklistVersion,
  riskMatrixTitle,
  riskMatrixLikelihoodLevels,
  riskMatrixConsequenceLevels,
  sections,
}: AssessmentWalkthroughProps) {
  const router = useRouter();
  const [criterionStates, setCriterionStates] = useState<CriterionStateMap>(
    () => buildInitialCriterionState(sections),
  );
  const [riskEntryStates, setRiskEntryStates] = useState<RiskEntryStateMap>(
    () => buildInitialRiskEntryState(sections),
  );
  const [riskEntryStatusByCriterionId, setRiskEntryStatusByCriterionId] =
    useState<CriterionRiskEntryStatusMap>(
      () => buildInitialCriterionRiskEntryStatus(sections),
    );
  const [transferState, setTransferState] = useState<{
    readonly status: "idle" | "transferring" | "success" | "error";
    readonly message: string | null;
  }>({
    status: "idle",
    message: null,
  });
  const criterionStatesRef = useRef<CriterionStateMap>(criterionStates);
  const riskEntryStatesRef = useRef<RiskEntryStateMap>(riskEntryStates);
  const pendingSaveTimersRef = useRef<Record<string, number | undefined>>({});

  criterionStatesRef.current = criterionStates;
  riskEntryStatesRef.current = riskEntryStates;

  useEffect(
    () => () => {
      for (const timerId of Object.values(pendingSaveTimersRef.current)) {
        if (typeof timerId === "number") {
          window.clearTimeout(timerId);
        }
      }
    },
    [],
  );

  useEffect(() => {
    setRiskEntryStatusByCriterionId(buildInitialCriterionRiskEntryStatus(sections));
  }, [sections]);

  useEffect(() => {
    setRiskEntryStates(buildInitialRiskEntryState(sections));
  }, [sections]);

  const {
    totalCriteria,
    answeredCriteria,
    completedSections,
    progressPercentage,
  } = getAssessmentWalkthroughProgress(sections, criterionStates);
  const {
    eligibleCriteria: eligibleTransferCriteria,
    transferredCriteria,
    remainingCriteria,
  } = getAssessmentRiskTransferProgress(
    criterionStates,
    riskEntryStatusByCriterionId,
  );
  const transferredRiskCriteria = sections.flatMap((section) =>
    section.criteria.flatMap((criterion) =>
      criterion.riskEntry ? [{ section, criterion }] : [],
    ),
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(115,138,92,0.18),transparent_34%),linear-gradient(180deg,#f7f1e6_0%,#efe5d1_54%,#e5dcc8_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 shadow-[0_28px_80px_rgba(28,29,24,0.12)] backdrop-blur">
          <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_20rem] lg:px-8 lg:py-8">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
                  Assessment Workflow
                </p>
                <div className="space-y-2">
                  <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    {workplaceName}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-700">
                    {checklistTitle} now carries the walkthrough and the in-flow
                    risk register. Answers still save against the persisted
                    assessment findings, and transferred rows can now be edited
                    and classified from the pinned matrix without leaving this
                    page.
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-[1.75rem] border border-black/10 bg-[#f6f1e7] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Progress
                    </div>
                    <div className="text-sm leading-6 text-slate-600">
                      {answeredCriteria} of {totalCriteria} criteria answered
                    </div>
                  </div>
                  <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm font-semibold text-slate-900">
                    {progressPercentage}%
                  </div>
                </div>
                <div className="h-2 rounded-full bg-black/8">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#465d3a_0%,#778d63_100%)] transition-[width]"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <aside className="grid gap-3 self-start sm:grid-cols-3 lg:grid-cols-1">
              <SummaryCard label="Checklist" value={`v${checklistVersion}`} />
              <SummaryCard
                label="Sections complete"
                value={`${completedSections}/${sections.length}`}
              />
              <SummaryCard label="Pinned matrix" value={riskMatrixTitle} />
            </aside>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="order-first self-start space-y-4 lg:sticky lg:top-6">
            <div className="rounded-[1.75rem] border border-black/10 bg-white/82 px-5 py-5 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Step 1b
                  </p>
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                      Transfer to risk register
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      Only persisted <span className="font-semibold">Not ok</span>{" "}
                      findings transfer. Re-running adds any missing rows without
                      duplicating existing register entries.
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-slate-700">
                  <TransferMetric
                    label="Eligible findings"
                    value={String(eligibleTransferCriteria)}
                  />
                  <TransferMetric
                    label="Already transferred"
                    value={String(transferredCriteria)}
                  />
                  <TransferMetric
                    label="Remaining to transfer"
                    value={String(remainingCriteria)}
                  />
                </div>

                <p
                  aria-live="polite"
                  className={getTransferMessageClassName(transferState.status)}
                >
                  {getTransferMessage({
                    transferState,
                    eligibleTransferCriteria,
                    remainingCriteria,
                  })}
                </p>

                <button
                  className={getTransferButtonClassName(
                    transferState.status === "transferring" ||
                      remainingCriteria === 0,
                  )}
                  disabled={
                    transferState.status === "transferring" ||
                    remainingCriteria === 0
                  }
                  onClick={handleTransferToRiskRegister}
                  type="button"
                >
                  {getTransferButtonLabel({
                    transferState: transferState.status,
                    remainingCriteria,
                  })}
                </button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-black/10 bg-[#243026] px-5 py-5 text-white shadow-[0_24px_60px_rgba(25,31,24,0.2)]">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Walkthrough notes
                  </h2>
                  <p className="text-sm leading-6 text-white/75">
                    Answers save immediately. Notes auto-save shortly after typing
                    pauses, and a blur saves any remaining edits. Transferred
                    risk entries save manually so the saved classification stays
                    explicit.
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-white/80">
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                    One seeded criterion equals one walkthrough item in this MVP
                    slice.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                    Summary capture, export, and broader safety-plan work stay in
                    later stories.
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="order-last space-y-5 lg:order-last">
            {sections.map((section) => (
              <section
                className="rounded-[2rem] border border-black/10 bg-white/82 p-4 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur sm:p-5 lg:p-6"
                key={section.id}
              >
                <div className="flex flex-col gap-3 border-b border-black/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                      Section {String(section.order).padStart(2, "0")}
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {section.translations.is.title}
                    </h2>
                  </div>
                  <div className="rounded-full border border-black/10 bg-[#f7f2e8] px-3 py-1.5 text-sm font-medium text-slate-700">
                    {getAnsweredCount(section.criteria, criterionStates)} of{" "}
                    {section.criteria.length} answered
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {section.criteria.map((criterion) => {
                    const state = criterionStates[criterion.id];

                    if (!state) {
                      return null;
                    }

                    return (
                      <article
                        className={getCriterionCardClassName(state)}
                        data-criterion-id={criterion.id}
                        data-selected-answer={state.draft.status}
                        key={criterion.id}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-3">
                              <div className="inline-flex w-fit items-center rounded-full border border-black/10 bg-[#f7f2e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                                Criterion {criterion.number}
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-lg font-semibold leading-7 text-slate-950">
                                  {criterion.translations.is.title}
                                </h3>
                                <p className="max-w-3xl text-sm leading-6 text-slate-700">
                                  {criterion.translations.is.guidance}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-start gap-2 sm:items-end">
                              {state.saved.status === "notOk" ? (
                                <TransferStatusPill
                                  status={
                                    riskEntryStatusByCriterionId[criterion.id] ??
                                    criterion.riskEntryStatus
                                  }
                                />
                              ) : null}
                              <SaveStatePill state={state} />
                            </div>
                          </div>

                          <div
                            aria-label={`Answer criterion ${criterion.number}`}
                            className="grid gap-2 sm:grid-cols-3"
                            role="radiogroup"
                          >
                            {ANSWER_OPTIONS.map((option) => (
                              <button
                                aria-checked={state.draft.status === option.value}
                                className={getAnswerOptionClassName(
                                  option.value,
                                  state.draft.status === option.value,
                                )}
                                data-answer-value={option.value}
                                data-selected={
                                  state.draft.status === option.value ? "true" : "false"
                                }
                                key={option.value}
                                onClick={() => handleStatusSelect(criterion.id, option.value)}
                                role="radio"
                                type="button"
                              >
                                <span className="text-sm font-semibold">
                                  {option.label}
                                </span>
                                <span className="text-sm leading-5 opacity-80">
                                  {option.description}
                                </span>
                              </button>
                            ))}
                          </div>

                          <div className="space-y-2">
                            <label
                              className="text-sm font-medium text-slate-900"
                              htmlFor={`notes-${criterion.id}`}
                            >
                              Notes
                            </label>
                            <textarea
                              className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                              id={`notes-${criterion.id}`}
                              onBlur={() => handleNotesBlur(criterion.id)}
                              onChange={(event) =>
                                handleNotesChange(criterion.id, event.target.value)
                              }
                              placeholder="Context, location, or follow-up detail..."
                              value={state.draft.notes}
                            />
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p
                              aria-live="polite"
                              className={getSaveMessageClassName(state)}
                            >
                              {getSaveMessage(state)}
                            </p>
                            {state.saveState === "error" ? (
                              <button
                                className="w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 sm:w-auto"
                                onClick={() => handleRetry(criterion.id)}
                                type="button"
                              >
                                Retry save
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}

            <section className="rounded-[2rem] border border-black/10 bg-white/82 p-4 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur sm:p-5 lg:p-6">
              <div className="flex flex-col gap-3 border-b border-black/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                    Steps 2-5
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    Risk register
                  </h2>
                  <p className="max-w-3xl text-sm leading-6 text-slate-700">
                    Transferred rows keep their walkthrough traceability and save
                    a server-derived classification from the pinned{" "}
                    {riskMatrixTitle} matrix only after likelihood and
                    consequence are persisted.
                  </p>
                </div>
                <div className="rounded-full border border-black/10 bg-[#f7f2e8] px-3 py-1.5 text-sm font-medium text-slate-700">
                  {transferredRiskCriteria.length} transferred{" "}
                  {pluralize(transferredRiskCriteria.length, "entry", "entries")}
                </div>
              </div>

              {transferredRiskCriteria.length === 0 ? (
                <div className="mt-4 rounded-[1.75rem] border border-dashed border-black/12 bg-[#fbf7ef] px-5 py-6 text-sm leading-6 text-slate-600">
                  Mark a walkthrough item as <span className="font-semibold">Not ok</span>{" "}
                  and transfer it to the risk register to unlock editing here.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {transferredRiskCriteria.map(({ section, criterion }) => {
                    const riskEntry = criterion.riskEntry;

                    if (!riskEntry) {
                      return null;
                    }

                    const riskEntryState = riskEntryStates[riskEntry.id];

                    if (!riskEntryState) {
                      return null;
                    }

                    return (
                      <article
                        className={getRiskEntryCardClassName(riskEntryState)}
                        data-risk-entry-id={riskEntry.id}
                        data-risk-level={riskEntryState.savedRiskLevel ?? "incomplete"}
                        key={riskEntry.id}
                      >
                        <div className="flex flex-col gap-5">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex w-fit items-center rounded-full border border-black/10 bg-[#f7f2e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                                  Criterion {criterion.number}
                                </span>
                                <span className="inline-flex w-fit items-center rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                  {section.translations.is.title}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                                  {criterion.translations.is.title}
                                </h3>
                                <p className="max-w-3xl text-sm leading-6 text-slate-700">
                                  Transferred from walkthrough step 1b. The saved
                                  classification is recalculated from the pinned
                                  matrix on every save.
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-start gap-2 lg:items-end">
                              <RiskLevelBadge
                                dirty={isRiskEntryDirty(riskEntryState)}
                                riskLevel={riskEntryState.savedRiskLevel}
                              />
                              <RiskEntrySaveStatePill state={riskEntryState} />
                            </div>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label
                                  className="text-sm font-medium text-slate-900"
                                  htmlFor={`hazard-${riskEntry.id}`}
                                >
                                  Hazard
                                </label>
                                <textarea
                                  className="min-h-24 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                                  data-field="hazard"
                                  id={`hazard-${riskEntry.id}`}
                                  onChange={(event) =>
                                    handleRiskEntryFieldChange(
                                      riskEntry.id,
                                      "hazard",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Describe the hazard..."
                                  value={riskEntryState.draft.hazard}
                                />
                              </div>

                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                  <label
                                    className="text-sm font-medium text-slate-900"
                                    htmlFor={`health-effects-${riskEntry.id}`}
                                  >
                                    Possible health effects
                                  </label>
                                  <textarea
                                    className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                                    id={`health-effects-${riskEntry.id}`}
                                    onChange={(event) =>
                                      handleRiskEntryFieldChange(
                                        riskEntry.id,
                                        "healthEffects",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Possible injury or health outcome..."
                                    value={riskEntryState.draft.healthEffects}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label
                                    className="text-sm font-medium text-slate-900"
                                    htmlFor={`who-at-risk-${riskEntry.id}`}
                                  >
                                    Who is at risk
                                  </label>
                                  <textarea
                                    className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                                    id={`who-at-risk-${riskEntry.id}`}
                                    onChange={(event) =>
                                      handleRiskEntryFieldChange(
                                        riskEntry.id,
                                        "whoAtRisk",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="People or roles affected..."
                                    value={riskEntryState.draft.whoAtRisk}
                                  />
                                </div>
                              </div>

                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                  <label
                                    className="text-sm font-medium text-slate-900"
                                    htmlFor={`current-controls-${riskEntry.id}`}
                                  >
                                    Current controls
                                  </label>
                                  <textarea
                                    className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                                    id={`current-controls-${riskEntry.id}`}
                                    onChange={(event) =>
                                      handleRiskEntryFieldChange(
                                        riskEntry.id,
                                        "currentControls",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="What is already in place?"
                                    value={riskEntryState.draft.currentControls}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label
                                    className="text-sm font-medium text-slate-900"
                                    htmlFor={`proposed-action-${riskEntry.id}`}
                                  >
                                    Corrective action or improvement
                                  </label>
                                  <textarea
                                    className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                                    id={`proposed-action-${riskEntry.id}`}
                                    onChange={(event) =>
                                      handleRiskEntryFieldChange(
                                        riskEntry.id,
                                        "proposedAction",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="What should change next?"
                                    value={riskEntryState.draft.proposedAction}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="rounded-[1.75rem] border border-black/10 bg-[#f8f2e7] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                                <div className="space-y-4">
                                  <div className="space-y-1">
                                    <h4 className="text-base font-semibold text-slate-950">
                                      Classification
                                    </h4>
                                    <p className="text-sm leading-6 text-slate-600">
                                      Choose generic 1-{riskMatrixLikelihoodLevels} likelihood
                                      and 1-{riskMatrixConsequenceLevels} consequence scores.
                                      The saved level comes only from the pinned matrix on
                                      the server.
                                    </p>
                                  </div>

                                  <div className="space-y-3">
                                    <ScoreSelector
                                      label="Likelihood"
                                      maxValue={riskMatrixLikelihoodLevels}
                                      onClear={() =>
                                        handleRiskScoreSelect(
                                          riskEntry.id,
                                          "likelihood",
                                          null,
                                        )
                                      }
                                      onSelect={(value) =>
                                        handleRiskScoreSelect(
                                          riskEntry.id,
                                          "likelihood",
                                          value,
                                        )
                                      }
                                      selectedValue={riskEntryState.draft.likelihood}
                                    />
                                    <ScoreSelector
                                      label="Consequence"
                                      maxValue={riskMatrixConsequenceLevels}
                                      onClear={() =>
                                        handleRiskScoreSelect(
                                          riskEntry.id,
                                          "consequence",
                                          null,
                                        )
                                      }
                                      onSelect={(value) =>
                                        handleRiskScoreSelect(
                                          riskEntry.id,
                                          "consequence",
                                          value,
                                        )
                                      }
                                      selectedValue={riskEntryState.draft.consequence}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <FieldGroup
                                  id={`cost-estimate-${riskEntry.id}`}
                                  label="Cost estimate"
                                >
                                  <input
                                    className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                                    id={`cost-estimate-${riskEntry.id}`}
                                    min={0}
                                    onChange={(event) =>
                                      handleRiskEntryFieldChange(
                                        riskEntry.id,
                                        "costEstimate",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="0"
                                    type="number"
                                    value={riskEntryState.draft.costEstimate}
                                  />
                                </FieldGroup>
                                <FieldGroup
                                  id={`responsible-owner-${riskEntry.id}`}
                                  label="Responsible owner"
                                >
                                  <input
                                    className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                                    id={`responsible-owner-${riskEntry.id}`}
                                    onChange={(event) =>
                                      handleRiskEntryFieldChange(
                                        riskEntry.id,
                                        "responsibleOwner",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Who owns this action?"
                                    type="text"
                                    value={riskEntryState.draft.responsibleOwner}
                                  />
                                </FieldGroup>
                                <FieldGroup
                                  id={`due-date-${riskEntry.id}`}
                                  label="Planned completion"
                                >
                                  <input
                                    className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                                    id={`due-date-${riskEntry.id}`}
                                    onChange={(event) =>
                                      handleRiskEntryFieldChange(
                                        riskEntry.id,
                                        "dueDate",
                                        event.target.value,
                                      )
                                    }
                                    type="date"
                                    value={riskEntryState.draft.dueDate}
                                  />
                                </FieldGroup>
                                <FieldGroup
                                  id={`completed-at-${riskEntry.id}`}
                                  label="Confirmed completion"
                                >
                                  <input
                                    className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                                    id={`completed-at-${riskEntry.id}`}
                                    onChange={(event) =>
                                      handleRiskEntryFieldChange(
                                        riskEntry.id,
                                        "completedAt",
                                        event.target.value,
                                      )
                                    }
                                    type="date"
                                    value={riskEntryState.draft.completedAt}
                                  />
                                </FieldGroup>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 border-t border-black/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <p
                              aria-live="polite"
                              className={getRiskEntrySaveMessageClassName(riskEntryState)}
                            >
                              {getRiskEntrySaveMessage(riskEntryState)}
                            </p>
                            <button
                              className={getRiskEntrySaveButtonClassName(
                                riskEntryState.saveState === "saving" ||
                                  !isRiskEntryDirty(riskEntryState),
                              )}
                              disabled={
                                riskEntryState.saveState === "saving" ||
                                !isRiskEntryDirty(riskEntryState)
                              }
                              onClick={() => handleRiskEntrySave(riskEntry.id)}
                              type="button"
                            >
                              {riskEntryState.saveState === "saving"
                                ? "Saving risk entry..."
                                : "Save risk entry"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );

  function handleStatusSelect(
    criterionId: string,
    status: SaveAssessmentCriterionStatus,
  ) {
    const currentState = criterionStatesRef.current[criterionId];

    if (!currentState) {
      return;
    }

    persistCriterion(criterionId, {
      ...currentState.draft,
      status,
    });
  }

  function handleNotesChange(criterionId: string, notes: string) {
    clearPendingSave(criterionId);

    setCriterionStates((current) =>
      updateCriterionDraftNotes(current, criterionId, notes),
    );

    scheduleSave(criterionId);
  }

  function handleNotesBlur(criterionId: string) {
    clearPendingSave(criterionId);
    const criterionState = criterionStatesRef.current[criterionId];

    if (
      !criterionState ||
      !isDirty(criterionState) ||
      !canPersistCriterionDraft(criterionState.draft)
    ) {
      return;
    }

    persistCriterion(criterionId, criterionState.draft);
  }

  function handleRetry(criterionId: string) {
    clearPendingSave(criterionId);
    const criterionState = criterionStatesRef.current[criterionId];

    if (!criterionState || !canPersistCriterionDraft(criterionState.draft)) {
      return;
    }

    persistCriterion(criterionId, criterionState.draft);
  }

  function handleTransferToRiskRegister() {
    if (transferState.status === "transferring" || remainingCriteria === 0) {
      return;
    }

    setTransferState({
      status: "transferring",
      message: null,
    });

    void transferAssessmentFindingsToRiskRegisterAction({
      assessmentId,
    })
      .then((response) => {
        startTransition(() => {
          setRiskEntryStatusByCriterionId((current) =>
            markTransferredRiskEntriesPresent(criterionStatesRef.current, current),
          );
          setTransferState({
            status: "success",
            message: buildTransferSuccessMessage(response),
          });
          router.refresh();
        });
      })
      .catch((error: unknown) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "We could not transfer these findings right now.";

        startTransition(() => {
          setTransferState({
            status: "error",
            message: errorMessage,
          });
        });
      });
  }

  function scheduleSave(criterionId: string) {
    clearPendingSave(criterionId);

    pendingSaveTimersRef.current[criterionId] = window.setTimeout(() => {
      pendingSaveTimersRef.current[criterionId] = undefined;
      const criterionState = criterionStatesRef.current[criterionId];

      if (
        !criterionState ||
        !isDirty(criterionState) ||
        !canPersistCriterionDraft(criterionState.draft)
      ) {
        return;
      }

      persistCriterion(criterionId, criterionState.draft);
    }, 650);
  }

  function clearPendingSave(criterionId: string) {
    const timerId = pendingSaveTimersRef.current[criterionId];

    if (typeof timerId === "number") {
      window.clearTimeout(timerId);
      pendingSaveTimersRef.current[criterionId] = undefined;
    }
  }

  function persistCriterion(criterionId: string, nextDraft: CriterionDraft) {
    clearPendingSave(criterionId);

    if (!canPersistCriterionDraft(nextDraft)) {
      return;
    }

    let nextRequestId = 0;

    setCriterionStates((current) => {
      const startedSave = beginCriterionSave(current, criterionId, nextDraft);
      nextRequestId = startedSave.requestId;
      return startedSave.criterionStates;
    });

    if (nextRequestId === 0) {
      return;
    }

    void saveAssessmentCriterionResponseAction({
      assessmentId,
      input: {
        criterionId,
        status: nextDraft.status,
        notes: nextDraft.notes,
      },
    })
      .then((response) => {
        startTransition(() => {
          setCriterionStates((current) => {
            return reconcileCriterionSaveSuccess(
              current,
              criterionId,
              nextRequestId,
              response,
              nextDraft,
            );
          });
        });
      })
      .catch((error: unknown) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "We could not save this walkthrough answer.";

        startTransition(() => {
          setCriterionStates((current) => {
            return reconcileCriterionSaveFailure(
              current,
              criterionId,
              nextRequestId,
              errorMessage,
            );
          });
        });
      });
  }

  function handleRiskEntryFieldChange<Field extends keyof RiskEntryDraft>(
    riskEntryId: string,
    field: Field,
    value: RiskEntryDraft[Field],
  ) {
    setRiskEntryStates((current) =>
      updateRiskEntryDraftField(current, riskEntryId, field, value),
    );
  }

  function handleRiskScoreSelect(
    riskEntryId: string,
    field: "likelihood" | "consequence",
    value: number | null,
  ) {
    setRiskEntryStates((current) =>
      updateRiskEntryDraftField(current, riskEntryId, field, value),
    );
  }

  function handleRiskEntrySave(riskEntryId: string) {
    const riskEntryState = riskEntryStatesRef.current[riskEntryId];

    if (!riskEntryState) {
      return;
    }

    if (!canPersistRiskEntryDraft(riskEntryState.draft)) {
      setRiskEntryStates((current) => {
        const currentRiskEntryState = current[riskEntryId];

        if (!currentRiskEntryState) {
          return current;
        }

        return {
          ...current,
          [riskEntryId]: {
            ...currentRiskEntryState,
            saveState: "error",
            errorMessage: "Hazard is required before saving this risk entry.",
          },
        };
      });
      return;
    }

    persistRiskEntry(riskEntryId, riskEntryState.draft);
  }

  function persistRiskEntry(riskEntryId: string, nextDraft: RiskEntryDraft) {
    let nextRequestId = 0;

    setRiskEntryStates((current) => {
      const startedSave = beginRiskEntrySave(current, riskEntryId);
      nextRequestId = startedSave.requestId;
      return startedSave.riskEntryStates;
    });

    if (nextRequestId === 0) {
      return;
    }

    void saveAssessmentRiskEntryAction({
      assessmentId,
      input: {
        riskEntryId,
        hazard: nextDraft.hazard,
        healthEffects: toOptionalString(nextDraft.healthEffects),
        whoAtRisk: toOptionalString(nextDraft.whoAtRisk),
        likelihood: nextDraft.likelihood ?? undefined,
        consequence: nextDraft.consequence ?? undefined,
        currentControls: toOptionalString(nextDraft.currentControls),
        proposedAction: toOptionalString(nextDraft.proposedAction),
        costEstimate: toOptionalInteger(nextDraft.costEstimate),
        responsibleOwner: toOptionalString(nextDraft.responsibleOwner),
        dueDate: toOptionalString(nextDraft.dueDate),
        completedAt: toOptionalString(nextDraft.completedAt),
      },
    })
      .then((response) => {
        startTransition(() => {
          setRiskEntryStates((current) =>
            reconcileRiskEntrySaveSuccess(
              current,
              riskEntryId,
              nextRequestId,
              response,
              nextDraft,
            ),
          );
        });
      })
      .catch((error: unknown) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "We could not save this risk entry.";

        startTransition(() => {
          setRiskEntryStates((current) =>
            reconcileRiskEntrySaveFailure(
              current,
              riskEntryId,
              nextRequestId,
              errorMessage,
            ),
          );
        });
      });
  }
}

function SummaryCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-[#fcfaf4] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold leading-7 text-slate-950">
        {value}
      </div>
    </div>
  );
}

function TransferMetric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-black/8 bg-[#f7f2e8] px-3 py-3">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="text-base font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function SaveStatePill({ state }: { readonly state: CriterionClientState }) {
  return (
    <div className={getSavePillClassName(state)}>
      {state.saveState === "saving"
        ? "Saving..."
        : state.saveState === "error"
          ? "Save issue"
          : state.draft.status === "unanswered" && state.draft.notes.length > 0
            ? "Needs answer"
          : isDirty(state)
            ? "Unsaved"
            : state.saved.status === "unanswered" && state.saved.notes.length === 0
              ? "Not started"
              : "Saved"}
    </div>
  );
}

function RiskEntrySaveStatePill({
  state,
}: {
  readonly state: RiskEntryClientState;
}) {
  return (
    <div className={getRiskEntrySavePillClassName(state)}>
      {state.saveState === "saving"
        ? "Saving..."
        : state.saveState === "error"
          ? "Save issue"
          : isRiskEntryDirty(state)
            ? "Unsaved"
            : "Saved"}
    </div>
  );
}

function RiskLevelBadge({
  riskLevel,
  dirty,
}: {
  readonly riskLevel: "low" | "medium" | "high" | null;
  readonly dirty: boolean;
}) {
  return (
    <div
      className={getRiskLevelBadgeClassName(riskLevel, dirty)}
      data-risk-level-state={dirty ? "pending" : riskLevel ?? "incomplete"}
    >
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] opacity-75">
        Saved level
      </div>
      <div className="text-sm font-semibold">
        {riskLevel ? capitalize(riskLevel) : "Incomplete"}
      </div>
      {dirty ? (
        <div className="text-[0.7rem] leading-5 opacity-75">Save to refresh</div>
      ) : null}
    </div>
  );
}

function TransferStatusPill({ status }: { readonly status: PresenceStatus }) {
  return (
    <div
      className={getTransferPillClassName(status)}
      data-transfer-state={status}
    >
      {status === "present" ? "Transferred" : "Needs transfer"}
    </div>
  );
}

function getCriterionCardClassName(state: CriterionClientState): string {
  return joinClasses(
    "rounded-[1.75rem] border bg-[#fffcf6] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors sm:p-5",
    state.saveState === "error"
      ? "border-[#bb6b4b] bg-[#fff4ed]"
      : isDirty(state)
        ? "border-[#9aa986] bg-[#faf7ef]"
        : "border-black/8",
  );
}

function getRiskEntryCardClassName(state: RiskEntryClientState): string {
  return joinClasses(
    "rounded-[1.75rem] border bg-[#fffdf8] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors sm:p-5",
    state.saveState === "error"
      ? "border-[#bb6b4b] bg-[#fff4ed]"
      : isRiskEntryDirty(state)
        ? "border-[#9aa986] bg-[#faf7ef]"
        : "border-black/8",
  );
}

function getAnswerOptionClassName(
  status: SaveAssessmentCriterionStatus,
  selected: boolean,
): string {
  const selectedClassName =
    status === "ok"
      ? "border-[#6f8460] bg-[#eef5e9] text-[#213019]"
      : status === "notOk"
        ? "border-[#b96f47] bg-[#fff1e7] text-[#6a3212]"
        : "border-[#8a7d6a] bg-[#f4efe6] text-[#3b3329]";

  return joinClasses(
    "flex min-h-24 flex-col items-start justify-between rounded-[1.35rem] border px-4 py-3 text-left transition hover:border-slate-400 hover:bg-white",
    selected ? selectedClassName : "border-black/10 bg-white text-slate-900",
  );
}

function getSavePillClassName(state: CriterionClientState): string {
  return joinClasses(
    "inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]",
    state.saveState === "saving"
      ? "border-[#7a8f67] bg-[#edf4ea] text-[#335126]"
      : state.saveState === "error"
        ? "border-[#bb6b4b] bg-[#fff1e8] text-[#7d3211]"
        : isDirty(state)
          ? "border-[#8a7d6a] bg-[#f3eee5] text-[#564938]"
          : "border-black/10 bg-[#f7f2e8] text-slate-600",
  );
}

function getRiskEntrySavePillClassName(state: RiskEntryClientState): string {
  return joinClasses(
    "inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]",
    state.saveState === "saving"
      ? "border-[#7a8f67] bg-[#edf4ea] text-[#335126]"
      : state.saveState === "error"
        ? "border-[#bb6b4b] bg-[#fff1e8] text-[#7d3211]"
        : isRiskEntryDirty(state)
          ? "border-[#8a7d6a] bg-[#f3eee5] text-[#564938]"
          : "border-black/10 bg-[#f7f2e8] text-slate-600",
  );
}

function getRiskLevelBadgeClassName(
  riskLevel: "low" | "medium" | "high" | null,
  dirty: boolean,
): string {
  const toneClassName =
    riskLevel === "high"
      ? "border-[#b96f47] bg-[#fff1e7] text-[#6a3212]"
      : riskLevel === "medium"
        ? "border-[#b59b42] bg-[#fff7dc] text-[#5d4b08]"
        : riskLevel === "low"
          ? "border-[#6f8460] bg-[#eef5e9] text-[#213019]"
          : "border-black/10 bg-[#f7f2e8] text-slate-600";

  return joinClasses(
    "rounded-[1.2rem] border px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
    dirty ? "border-[#8a7d6a] bg-[#f3eee5] text-[#564938]" : toneClassName,
  );
}

function getTransferPillClassName(status: PresenceStatus): string {
  return joinClasses(
    "inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]",
    status === "present"
      ? "border-[#6f8460] bg-[#edf4ea] text-[#335126]"
      : "border-[#b96f47] bg-[#fff1e7] text-[#6a3212]",
  );
}

function getSaveMessage(state: CriterionClientState): string {
  if (state.saveState === "saving") {
    return "Saving this criterion...";
  }

  if (state.saveState === "error") {
    return state.errorMessage ?? "We could not save this criterion.";
  }

  if (state.draft.status === "unanswered" && state.draft.notes.length > 0) {
    return "Select an answer before notes can be saved.";
  }

  if (isDirty(state)) {
    return "Changes pending save.";
  }

  if (state.lastSavedAt) {
    return `Saved ${formatSavedAt(state.lastSavedAt)}.`;
  }

  return state.saved.status === "unanswered" && state.saved.notes.length === 0
    ? "Answer and notes are ready to capture."
    : "Saved and ready to resume.";
}

function getRiskEntrySaveMessage(state: RiskEntryClientState): string {
  if (state.saveState === "saving") {
    return "Saving this risk entry...";
  }

  if (state.saveState === "error") {
    return state.errorMessage ?? "We could not save this risk entry.";
  }

  if (!canPersistRiskEntryDraft(state.draft)) {
    return "Hazard is required before this row can be saved.";
  }

  if (isRiskEntryDirty(state)) {
    return "Changes pending save. The saved classification updates after save.";
  }

  return state.savedRiskLevel
    ? `Saved classification: ${capitalize(state.savedRiskLevel)}.`
    : "Saved draft. Add both scores to derive the classification.";
}

function getSaveMessageClassName(state: CriterionClientState): string {
  return joinClasses(
    "text-sm leading-6",
    state.saveState === "error" ? "text-[#8a2f0d]" : "text-slate-600",
  );
}

function getRiskEntrySaveMessageClassName(state: RiskEntryClientState): string {
  return joinClasses(
    "text-sm leading-6",
    state.saveState === "error" ? "text-[#8a2f0d]" : "text-slate-600",
  );
}

function getTransferMessage(params: {
  readonly transferState: {
    readonly status: "idle" | "transferring" | "success" | "error";
    readonly message: string | null;
  };
  readonly eligibleTransferCriteria: number;
  readonly remainingCriteria: number;
}): string {
  if (params.transferState.status === "transferring") {
    return "Transferring eligible findings into the risk register...";
  }

  if (params.transferState.message) {
    return params.transferState.message;
  }

  if (params.eligibleTransferCriteria === 0) {
    return "Mark a criterion as Not ok to make it eligible for transfer.";
  }

  if (params.remainingCriteria === 0) {
    return "All persisted Not ok findings are already in the risk register.";
  }

  return "Transfer will add only the persisted Not ok findings that are still missing.";
}

function getTransferMessageClassName(
  status: "idle" | "transferring" | "success" | "error",
): string {
  return joinClasses(
    "text-sm leading-6",
    status === "error"
      ? "text-[#8a2f0d]"
      : status === "success"
        ? "text-[#335126]"
        : "text-slate-600",
  );
}

function getTransferButtonClassName(disabled: boolean): string {
  return joinClasses(
    "w-full rounded-full px-4 py-3 text-sm font-semibold transition",
    disabled
      ? "cursor-not-allowed border border-black/10 bg-[#ebe4d7] text-slate-500"
      : "border border-[#243026] bg-[#243026] text-white shadow-[0_12px_28px_rgba(25,31,24,0.16)] hover:bg-[#314035]",
  );
}

function getRiskEntrySaveButtonClassName(disabled: boolean): string {
  return joinClasses(
    "w-full rounded-full px-4 py-3 text-sm font-semibold transition sm:w-auto",
    disabled
      ? "cursor-not-allowed border border-black/10 bg-[#ebe4d7] text-slate-500"
      : "border border-[#243026] bg-[#243026] text-white shadow-[0_12px_28px_rgba(25,31,24,0.16)] hover:bg-[#314035]",
  );
}

function getTransferButtonLabel(params: {
  readonly transferState: "idle" | "transferring" | "success" | "error";
  readonly remainingCriteria: number;
}): string {
  if (params.transferState === "transferring") {
    return "Transferring...";
  }

  if (params.remainingCriteria === 0) {
    return "All eligible findings transferred";
  }

  return `Transfer ${params.remainingCriteria} ${pluralize(params.remainingCriteria, "finding", "findings")}`;
}

function buildTransferSuccessMessage(
  response: TransferAssessmentFindingsToRiskRegisterOutput,
): string {
  if (response.createdRiskEntryCount === 0 && response.existingRiskEntryCount > 0) {
    return `All ${response.existingRiskEntryCount} eligible ${pluralize(response.existingRiskEntryCount, "finding was", "findings were")} already in the risk register.`;
  }

  if (response.existingRiskEntryCount === 0) {
    return `Transferred ${response.createdRiskEntryCount} ${pluralize(response.createdRiskEntryCount, "finding", "findings")} into the risk register.`;
  }

  return `Transferred ${response.createdRiskEntryCount} ${pluralize(response.createdRiskEntryCount, "finding", "findings")} and kept ${response.existingRiskEntryCount} existing ${pluralize(response.existingRiskEntryCount, "entry", "entries")} in place.`;
}

function formatSavedAt(value: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function FieldGroup({
  id,
  label,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-900" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ScoreSelector({
  label,
  maxValue,
  selectedValue,
  onSelect,
  onClear,
}: {
  readonly label: string;
  readonly maxValue: number;
  readonly selectedValue: number | null;
  readonly onSelect: (value: number) => void;
  readonly onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        {selectedValue != null ? (
          <button
            className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-900"
            onClick={onClear}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {Array.from({ length: maxValue }, (_, index) => index + 1).map((value) => (
          <button
            className={getScoreOptionClassName(selectedValue === value)}
            data-score-label={label}
            data-score-value={String(value)}
            key={value}
            onClick={() => onSelect(value)}
            type="button"
          >
            {String(value)}
          </button>
        ))}
      </div>
    </div>
  );
}

function getScoreOptionClassName(selected: boolean): string {
  return joinClasses(
    "rounded-[1rem] border px-3 py-3 text-sm font-semibold transition",
    selected
      ? "border-[#6f8460] bg-[#eef5e9] text-[#213019]"
      : "border-black/10 bg-white text-slate-900 hover:border-slate-400",
  );
}

function toOptionalString(value: string): string | undefined {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function toOptionalInteger(value: string): number | undefined {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return undefined;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isInteger(parsedValue) ? parsedValue : undefined;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function joinClasses(...classNames: ReadonlyArray<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  return count === 1 ? singular : plural;
}
