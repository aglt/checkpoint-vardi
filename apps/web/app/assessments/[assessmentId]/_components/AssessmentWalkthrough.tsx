"use client";

import React, { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  SaveAssessmentCriterionStatus,
  TransferAssessmentFindingsToRiskRegisterOutput,
} from "@vardi/schemas";

import {
  beginCriterionSave,
  buildInitialCriterionRiskEntryStatus,
  buildInitialCriterionState,
  getAssessmentRiskTransferProgress,
  canPersistCriterionDraft,
  getAnsweredCount,
  getAssessmentWalkthroughProgress,
  isDirty,
  markTransferredRiskEntriesPresent,
  reconcileCriterionSaveFailure,
  reconcileCriterionSaveSuccess,
  type CriterionClientState,
  type CriterionDraft,
  type CriterionRiskEntryStatusMap,
  type CriterionStateMap,
  updateCriterionDraftNotes,
} from "@/lib/assessments/assessmentWalkthroughController";
import type {
  AssessmentSectionReadModel,
  PresenceStatus,
} from "@/lib/assessments/loadAssessmentReadModel";
import { saveAssessmentCriterionResponseAction } from "@/lib/assessments/saveAssessmentCriterionResponseAction";
import { transferAssessmentFindingsToRiskRegisterAction } from "@/lib/assessments/transferAssessmentFindingsToRiskRegisterAction";

interface AssessmentWalkthroughProps {
  readonly assessmentId: string;
  readonly workplaceName: string;
  readonly checklistTitle: string;
  readonly checklistVersion: string;
  readonly riskMatrixTitle: string;
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
  sections,
}: AssessmentWalkthroughProps) {
  const router = useRouter();
  const [criterionStates, setCriterionStates] = useState<CriterionStateMap>(
    () => buildInitialCriterionState(sections),
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
  const pendingSaveTimersRef = useRef<Record<string, number | undefined>>({});

  criterionStatesRef.current = criterionStates;

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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(115,138,92,0.18),transparent_34%),linear-gradient(180deg,#f7f1e6_0%,#efe5d1_54%,#e5dcc8_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 shadow-[0_28px_80px_rgba(28,29,24,0.12)] backdrop-blur">
          <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_20rem] lg:px-8 lg:py-8">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
                  Walkthrough Form Slice
                </p>
                <div className="space-y-2">
                  <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    {workplaceName}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-700">
                    {checklistTitle} is now live as the core walkthrough. Answers
                    and notes save against the persisted assessment findings, so a
                    refresh resumes exactly where the walkthrough left off.
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
                    pauses, and a blur saves any remaining edits.
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-white/80">
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                    One seeded criterion equals one walkthrough item in this MVP
                    slice.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                    Risk transfer, scoring, summary capture, and export stay in
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

function getSaveMessageClassName(state: CriterionClientState): string {
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
