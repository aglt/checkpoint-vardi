"use client";

import React, { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AssessmentWalkthroughAttentionSeverity,
  SaveAssessmentCriterionStatus,
} from "@vardi/schemas";

import {
  beginCriterionSave,
  buildInitialCriterionRiskEntryStatus,
  buildInitialCriterionState,
  canPersistCriterionDraft,
  getAssessmentRiskTransferProgress,
  getAssessmentWalkthroughProgress,
  getDraftWalkthroughItemState,
  getNextBlocker,
  getRecoveryCriterionId,
  getSavedWalkthroughItemState,
  getSectionWalkthroughSummary,
  isDirty,
  markTransferredRiskEntriesPresent,
  reconcileCriterionSaveFailure,
  reconcileCriterionSaveSuccess,
  type CriterionClientState,
  type CriterionDraft,
  type CriterionRiskEntryStatusMap,
  type CriterionStateMap,
  type NextBlocker,
  type WalkthroughItemState,
} from "@/lib/assessments/assessmentWalkthroughController";
import type { AssessmentSectionReadModel } from "@/lib/assessments/loadAssessmentReadModel";
import type { AppLanguage } from "@/lib/i18n/appLanguage";
import {
  buildTransferSuccessMessage,
  getAnswerOptions,
  getAssessmentProgressionBlockerMessages,
  getAssessmentWalkthroughStaticCopy,
  getProgressCountLabel,
  getTransferButtonLabel,
  getTransferMessage,
  getWalkthroughAttentionCountLabel,
  getWalkthroughItemStateLabel,
  getWalkthroughNextBlockerMessage,
  getWalkthroughSaveStateMessage,
  getWalkthroughSectionCountsLabel,
} from "@/lib/i18n/mvpCopy";
import { saveAssessmentCriterionResponseAction } from "@/lib/assessments/saveAssessmentCriterionResponseAction";
import { transferAssessmentFindingsToRiskRegisterAction } from "@/lib/assessments/transferAssessmentFindingsToRiskRegisterAction";
import { useAssessmentProgression } from "./AssessmentProgressionContext";

interface AssessmentWalkthroughProps {
  readonly assessmentId: string;
  readonly workplaceName: string;
  readonly checklistTitle: string;
  readonly language: AppLanguage;
  readonly sections: readonly AssessmentSectionReadModel[];
  readonly children?: React.ReactNode;
}

type SaveMode = "none" | "immediate" | "debounced";

export function AssessmentWalkthrough({
  assessmentId,
  workplaceName,
  checklistTitle,
  language,
  sections,
  children,
}: AssessmentWalkthroughProps) {
  const router = useRouter();
  const { progression, refreshProgression } = useAssessmentProgression();
  const copy = getAssessmentWalkthroughStaticCopy(language);
  const answerOptions =
    getAnswerOptions(language) satisfies ReadonlyArray<{
      readonly value: SaveAssessmentCriterionStatus;
      readonly label: string;
      readonly description: string;
    }>;
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
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    sections[0]?.id ?? null,
  );
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(
    getRecoveryCriterionId(sections[0]?.criteria ?? [], buildInitialCriterionState(sections)),
  );
  const criterionStatesRef = useRef<CriterionStateMap>(criterionStates);
  const autosaveTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout> | undefined>
  >({});

  criterionStatesRef.current = criterionStates;

  useEffect(() => {
    setCriterionStates(buildInitialCriterionState(sections));
    setRiskEntryStatusByCriterionId(buildInitialCriterionRiskEntryStatus(sections));
  }, [sections]);

  useEffect(() => {
    if (sections.some((section) => section.id === selectedSectionId)) {
      return;
    }

    const firstSection = sections[0] ?? null;
    setSelectedSectionId(firstSection?.id ?? null);
    setSelectedCriterionId(
      getRecoveryCriterionId(firstSection?.criteria ?? [], criterionStatesRef.current),
    );
  }, [sections, selectedSectionId]);

  useEffect(() => {
    return () => {
      for (const timer of Object.values(autosaveTimersRef.current)) {
        if (timer) {
          clearTimeout(timer);
        }
      }
    };
  }, []);

  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) ?? sections[0] ?? null;
  const selectedSectionCriteria = selectedSection?.criteria ?? [];

  useEffect(() => {
    if (!selectedSection) {
      setSelectedCriterionId(null);
      return;
    }

    if (
      selectedCriterionId &&
      selectedSectionCriteria.some((criterion) => criterion.id === selectedCriterionId)
    ) {
      return;
    }

    setSelectedCriterionId(
      getRecoveryCriterionId(selectedSectionCriteria, criterionStatesRef.current),
    );
  }, [selectedCriterionId, selectedSection, selectedSectionCriteria]);

  const selectedCriterion =
    selectedSectionCriteria.find((criterion) => criterion.id === selectedCriterionId) ??
    selectedSectionCriteria[0] ??
    null;
  const selectedCriterionState = selectedCriterion
    ? criterionStates[selectedCriterion.id] ?? null
    : null;
  const progress = getAssessmentWalkthroughProgress(sections, criterionStates);
  const transferProgress = getAssessmentRiskTransferProgress(
    criterionStates,
    riskEntryStatusByCriterionId,
  );
  const flatCriteria = sections.flatMap((section) =>
    section.criteria.map((criterion) => ({ section, criterion })),
  );
  const selectedCriterionIndex = selectedCriterion
    ? flatCriteria.findIndex((entry) => entry.criterion.id === selectedCriterion.id)
    : -1;
  const previousCriterionEntry =
    selectedCriterionIndex > 0 ? flatCriteria[selectedCriterionIndex - 1] : null;
  const nextCriterionEntry =
    selectedCriterionIndex >= 0 && selectedCriterionIndex < flatCriteria.length - 1
      ? flatCriteria[selectedCriterionIndex + 1]
      : null;
  const currentItemState = selectedCriterionState
    ? getDraftWalkthroughItemState(selectedCriterionState)
    : "notAnswered";
  const nextBlocker = selectedCriterionState ? getNextBlocker(selectedCriterionState) : null;
  const transferBlockerMessages = getAssessmentProgressionBlockerMessages(
    language,
    progression.riskRegister.blockers.filter(
      (blocker) => blocker.code === "riskRegisterMissingTransfers",
    ),
  );

  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(115,138,92,0.18),transparent_34%),linear-gradient(180deg,#f7f1e6_0%,#efe5d1_54%,#e5dcc8_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8"
      data-assessment-current-step={progression.currentStepId}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/84 shadow-[0_28px_80px_rgba(28,29,24,0.12)] backdrop-blur">
          <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,22rem)] lg:px-8 lg:py-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
                {copy.eyebrow}
              </p>
              <p className="text-sm font-medium text-slate-600">{checklistTitle}</p>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {workplaceName}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-700">
                {copy.description}
              </p>
            </div>

            <div
              className="rounded-[1.75rem] border border-black/10 bg-[#f6f1e7] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-5"
              data-walkthrough-global-progress="true"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {copy.progressLabel}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {getProgressCountLabel(language, {
                      completedCriteria: progress.validCompletedCriteria,
                      totalCriteria: progress.totalCriteria,
                    })}
                  </p>
                </div>
                {progress.needsAttentionCriteria > 0 ? (
                  <span className="inline-flex items-center rounded-full border border-[#c6ab70] bg-[#fff3d6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5a1f]">
                    {getWalkthroughAttentionCountLabel(
                      language,
                      progress.needsAttentionCriteria,
                    )}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#577347_0%,#7d956d_100%)] transition-[width]"
                  data-progress-percentage={String(progress.progressPercentage)}
                  style={{ width: `${progress.progressPercentage}%` }}
                />
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {copy.globalProgressDescription}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="order-first self-start lg:sticky lg:top-6">
            <div className="rounded-[1.75rem] border border-black/10 bg-white/82 px-5 py-5 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {copy.chapterRailHeading}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {copy.chapterRailDescription}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {sections.map((section) => {
                  const summary = getSectionWalkthroughSummary(
                    section.criteria,
                    criterionStates,
                  );

                  return (
                    <button
                      className={getSectionButtonClassName(
                        section.id === selectedSection?.id,
                        summary.itemState,
                      )}
                      data-section-id={section.id}
                      data-section-selected={
                        section.id === selectedSection?.id ? "true" : "false"
                      }
                      data-section-state={summary.itemState}
                      key={section.id}
                      onClick={() => handleSectionSelect(section.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 text-left">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {copy.sectionLabel} {String(section.order).padStart(2, "0")}
                          </p>
                          <h2 className="text-sm font-semibold leading-6 text-slate-950">
                            {section.translations.is.title}
                          </h2>
                        </div>
                        <span
                          className={getItemStateBadgeClassName(summary.itemState)}
                        >
                          {getWalkthroughItemStateLabel(language, summary.itemState)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {getWalkthroughSectionCountsLabel(language, {
                          unansweredCount: summary.unansweredCount,
                          attentionCount: summary.attentionCount,
                        })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="order-last space-y-5">
            {selectedSection && selectedCriterion && selectedCriterionState ? (
              <section
                className="rounded-[2rem] border border-black/10 bg-white/82 p-5 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur sm:p-6"
                data-criterion-id={selectedCriterion.id}
                data-selected-answer={selectedCriterionState.draft.status}
                data-walkthrough-item-state={currentItemState}
              >
                <div className="border-b border-black/8 pb-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <span>
                          {copy.sectionLabel} {String(selectedSection.order).padStart(2, "0")}
                        </span>
                        <span>·</span>
                        <span>
                          {copy.positionLabels.itemInChapter(
                            criterionPositionInSection(selectedSectionCriteria, selectedCriterion),
                            selectedSectionCriteria.length,
                          )}
                        </span>
                        <span>·</span>
                        <span>
                          {copy.positionLabels.itemInAssessment(
                            selectedCriterionIndex + 1,
                            flatCriteria.length,
                          )}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">
                          {selectedSection.translations.is.title}
                        </p>
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                          {selectedCriterion.translations.is.title}
                        </h2>
                        <p className="max-w-3xl text-sm leading-6 text-slate-700">
                          {selectedCriterion.translations.is.guidance}
                        </p>
                      </div>
                    </div>

                    <span className={getItemStateBadgeClassName(currentItemState)}>
                      {getWalkthroughItemStateLabel(language, currentItemState)}
                    </span>
                  </div>
                </div>

                <article className="mt-5 space-y-5">
                  <div
                    aria-label={copy.answerAriaLabel(selectedCriterion.number)}
                    className="grid gap-2 sm:grid-cols-3"
                    role="radiogroup"
                  >
                    {answerOptions.map((option) => (
                      <button
                        aria-checked={selectedCriterionState.draft.status === option.value}
                        className={getAnswerOptionClassName(
                          option.value,
                          selectedCriterionState.draft.status === option.value,
                        )}
                        data-answer-value={option.value}
                        data-selected={
                          selectedCriterionState.draft.status === option.value
                            ? "true"
                            : "false"
                        }
                        key={option.value}
                        onClick={() =>
                          handleStatusSelect(selectedCriterion.id, option.value)
                        }
                        role="radio"
                        type="button"
                      >
                        <span className="text-sm font-semibold">{option.label}</span>
                        <span className="text-sm leading-5 opacity-80">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedCriterionState.draft.status === "notOk" ? (
                    <section className="rounded-[1.5rem] border border-[#d6c4a1] bg-[#fff8ea] px-4 py-4">
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {copy.severity.label}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {copy.severity.description}
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          {(
                            ["small", "medium", "large"] as const
                          ).map((attentionSeverity) => (
                            <button
                              className={getSeverityOptionClassName(
                                attentionSeverity,
                                selectedCriterionState.draft.attentionSeverity ===
                                  attentionSeverity,
                              )}
                              data-attention-severity={attentionSeverity}
                              data-selected={
                                selectedCriterionState.draft.attentionSeverity ===
                                attentionSeverity
                                  ? "true"
                                  : "false"
                              }
                              key={attentionSeverity}
                              onClick={() =>
                                handleAttentionSeveritySelect(
                                  selectedCriterion.id,
                                  attentionSeverity,
                                )
                              }
                              type="button"
                            >
                              {copy.severity.options[attentionSeverity]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>
                  ) : null}

                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium text-slate-900"
                      htmlFor={`notes-${selectedCriterion.id}`}
                    >
                      {copy.notesLabel}
                    </label>
                    <textarea
                      className="min-h-32 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                      id={`notes-${selectedCriterion.id}`}
                      onChange={(event) =>
                        handleNotesChange(selectedCriterion.id, event.target.value)
                      }
                      placeholder={copy.notesPlaceholder}
                      value={selectedCriterionState.draft.notes}
                    />
                  </div>

                  <div className="border-t border-black/8 pt-4">
                    <p
                      aria-live="polite"
                      className={getSaveMessageClassName(selectedCriterionState)}
                    >
                      {getWalkthroughSaveStateMessage({
                        language,
                        saveState: selectedCriterionState.saveState,
                        savedItemState: getSavedWalkthroughItemState(
                          selectedCriterionState,
                        ),
                        lastSavedAt: selectedCriterionState.lastSavedAt,
                        errorMessage: selectedCriterionState.errorMessage,
                      })}
                    </p>

                    {nextBlocker ? (
                      <p className="mt-2 text-sm leading-6 text-[#7d3211]">
                        {getWalkthroughNextBlockerMessage(language, nextBlocker)}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        className={getSecondaryActionButtonClassName(
                          previousCriterionEntry === null,
                        )}
                        disabled={previousCriterionEntry === null}
                        onClick={() => navigateToCriterion(previousCriterionEntry)}
                        type="button"
                      >
                        {copy.previousCriterion}
                      </button>

                      <div className="flex flex-col items-end gap-2">
                        {nextCriterionEntry ? (
                          <button
                            className={getPrimaryActionButtonClassName(
                              nextBlocker !== null,
                            )}
                            disabled={nextBlocker !== null}
                            onClick={() => navigateToCriterion(nextCriterionEntry)}
                            type="button"
                          >
                            {copy.nextCriterion}
                          </button>
                        ) : (
                          <p className="text-sm leading-6 text-slate-600">
                            {copy.lastItemMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </section>
            ) : null}

            <section className="rounded-[1.75rem] border border-black/10 bg-white/82 p-5 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {copy.transfer.eyebrow}
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {copy.transfer.heading}
                  </h2>
                  <p className="max-w-3xl text-sm leading-6 text-slate-600">
                    {copy.transfer.description}
                  </p>
                </div>

                <div className="w-full max-w-md space-y-3 rounded-[1.5rem] border border-black/10 bg-[#f7f2e8] p-4">
                  <p
                    aria-live="polite"
                    className={getTransferMessageClassName(transferState.status)}
                  >
                    {getTransferMessage({
                      language,
                      status: transferState.status,
                      message:
                        transferState.message ??
                        transferBlockerMessages[0] ??
                        null,
                      eligibleTransferCriteria: transferProgress.eligibleCriteria,
                      remainingCriteria: transferProgress.remainingCriteria,
                    })}
                  </p>

                  <button
                    className={getPrimaryActionButtonClassName(
                      transferState.status === "transferring" ||
                        transferProgress.remainingCriteria === 0,
                    )}
                    data-transfer-action="risk-register"
                    disabled={
                      transferState.status === "transferring" ||
                      transferProgress.remainingCriteria === 0
                    }
                    onClick={handleTransferToRiskRegister}
                    type="button"
                  >
                    {getTransferButtonLabel({
                      language,
                      status: transferState.status,
                      remainingCriteria: transferProgress.remainingCriteria,
                    })}
                  </button>
                </div>
              </div>
            </section>

            {children}
          </div>
        </div>
      </div>
    </main>
  );

  function handleSectionSelect(sectionId: string) {
    const section = sections.find((candidate) => candidate.id === sectionId);

    if (!section) {
      return;
    }

    setSelectedSectionId(sectionId);
    setSelectedCriterionId(
      getRecoveryCriterionId(section.criteria, criterionStatesRef.current),
    );
  }

  function handleStatusSelect(
    criterionId: string,
    status: SaveAssessmentCriterionStatus,
  ) {
    const criterionState = criterionStatesRef.current[criterionId];

    if (!criterionState) {
      return;
    }

    const nextDraft = {
      ...criterionState.draft,
      status,
      attentionSeverity:
        status === "notOk" ? criterionState.draft.attentionSeverity : null,
    } satisfies CriterionDraft;

    applyDraftChange(
      criterionId,
      nextDraft,
      canPersistCriterionDraft(nextDraft) ? "immediate" : "none",
    );
  }

  function handleAttentionSeveritySelect(
    criterionId: string,
    attentionSeverity: AssessmentWalkthroughAttentionSeverity,
  ) {
    const criterionState = criterionStatesRef.current[criterionId];

    if (!criterionState) {
      return;
    }

    const nextDraft = {
      ...criterionState.draft,
      attentionSeverity,
    } satisfies CriterionDraft;

    applyDraftChange(criterionId, nextDraft, "immediate");
  }

  function handleNotesChange(criterionId: string, notes: string) {
    const criterionState = criterionStatesRef.current[criterionId];

    if (!criterionState) {
      return;
    }

    const nextDraft = {
      ...criterionState.draft,
      notes,
    } satisfies CriterionDraft;

    applyDraftChange(
      criterionId,
      nextDraft,
      canPersistCriterionDraft(nextDraft) ? "debounced" : "none",
    );
  }

  function navigateToCriterion(
    entry:
      | {
          readonly section: AssessmentSectionReadModel;
          readonly criterion: AssessmentSectionReadModel["criteria"][number];
        }
      | null,
  ) {
    if (!entry) {
      return;
    }

    setSelectedSectionId(entry.section.id);
    setSelectedCriterionId(entry.criterion.id);
  }

  function applyDraftChange(
    criterionId: string,
    nextDraft: CriterionDraft,
    mode: SaveMode,
  ) {
    clearAutosaveTimer(criterionId);

    const currentState = criterionStatesRef.current[criterionId];

    if (!currentState) {
      return;
    }

    if (
      currentState.saved.status === nextDraft.status &&
      currentState.saved.attentionSeverity === nextDraft.attentionSeverity &&
      currentState.saved.notes === nextDraft.notes
    ) {
      const nextStates = {
        ...criterionStatesRef.current,
        [criterionId]: {
          ...currentState,
          draft: nextDraft,
          saveState: "idle" as const,
          errorMessage: null,
        },
      };

      criterionStatesRef.current = nextStates;
      setCriterionStates(nextStates);
      return;
    }

    if (mode === "none" || !canPersistCriterionDraft(nextDraft)) {
      const nextStates = {
        ...criterionStatesRef.current,
        [criterionId]: {
          ...currentState,
          draft: nextDraft,
          saveState: "idle" as const,
          errorMessage: null,
        },
      };

      criterionStatesRef.current = nextStates;
      setCriterionStates(nextStates);
      return;
    }

    const startedSave = beginCriterionSave(
      criterionStatesRef.current,
      criterionId,
      nextDraft,
    );

    if (startedSave.requestId === 0) {
      return;
    }

    criterionStatesRef.current = startedSave.criterionStates;
    setCriterionStates(startedSave.criterionStates);

    const sendSave = () => {
      startTransition(async () => {
        try {
          const response = await saveAssessmentCriterionResponseAction({
            assessmentId,
            input: {
              criterionId,
              status: nextDraft.status,
              attentionSeverity: nextDraft.attentionSeverity ?? undefined,
              notes: nextDraft.notes,
            },
          });

          startTransition(() => {
            setCriterionStates((current) => {
              const nextStates = reconcileCriterionSaveSuccess(
                current,
                criterionId,
                startedSave.requestId,
                response,
                nextDraft,
              );

              criterionStatesRef.current = nextStates;
              return nextStates;
            });
          });
          await refreshProgression();
        } catch (error: unknown) {
          startTransition(() => {
            setCriterionStates((current) => {
              const nextStates = reconcileCriterionSaveFailure(
                current,
                criterionId,
                startedSave.requestId,
                copy.fallbacks.criterionSave,
              );

              criterionStatesRef.current = nextStates;
              return nextStates;
            });
          });
        }
      });
    };

    if (mode === "debounced") {
      autosaveTimersRef.current[criterionId] = setTimeout(sendSave, 500);
      return;
    }

    sendSave();
  }

  function clearAutosaveTimer(criterionId: string) {
    const timer = autosaveTimersRef.current[criterionId];

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    delete autosaveTimersRef.current[criterionId];
  }

  function handleTransferToRiskRegister() {
    if (
      transferState.status === "transferring" ||
      transferProgress.remainingCriteria === 0
    ) {
      return;
    }

    setTransferState({
      status: "transferring",
      message: null,
    });

    startTransition(async () => {
      try {
        const response = await transferAssessmentFindingsToRiskRegisterAction({
          assessmentId,
        });

        startTransition(() => {
          setRiskEntryStatusByCriterionId((current) =>
            markTransferredRiskEntriesPresent(criterionStatesRef.current, current),
          );
          setTransferState({
            status: "success",
            message: buildTransferSuccessMessage({
              language,
              createdRiskEntryCount: response.createdRiskEntryCount,
              existingRiskEntryCount: response.existingRiskEntryCount,
            }),
          });
          router.refresh();
        });
      } catch (error: unknown) {
        startTransition(() => {
          setTransferState({
            status: "error",
            message: copy.fallbacks.transfer,
          });
        });
      }
    });
  }
}

function criterionPositionInSection(
  criteria: readonly AssessmentSectionReadModel["criteria"][number][],
  criterion: AssessmentSectionReadModel["criteria"][number],
): number {
  const index = criteria.findIndex((candidate) => candidate.id === criterion.id);
  return index >= 0 ? index + 1 : 1;
}

function getSectionButtonClassName(
  selected: boolean,
  itemState: WalkthroughItemState,
): string {
  return joinClasses(
    "w-full rounded-[1.3rem] border px-4 py-4 text-left transition",
    selected
      ? "border-[#6f8460] bg-[#edf4ea] shadow-[0_14px_30px_rgba(43,67,31,0.08)]"
      : itemState === "notAnswered"
        ? "border-[#d8c8a6] bg-[#fffaf0] hover:border-[#9b8b67]"
        : itemState === "needsAttention"
          ? "border-[#d6b09a] bg-[#fff8f2] hover:border-[#bb6b4b]"
          : "border-black/10 bg-[#fbf7ef] hover:border-[#8da17f] hover:bg-white",
  );
}

function getItemStateBadgeClassName(itemState: WalkthroughItemState): string {
  return joinClasses(
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
    itemState === "complete"
      ? "border-[#a8c2a1] bg-[#e7f1e2] text-[#355428]"
      : itemState === "needsAttention"
        ? "border-[#c6ab70] bg-[#fff3d6] text-[#7a5a1f]"
        : "border-[#d6b09a] bg-[#fff1e8] text-[#7d3211]",
  );
}

function getAnswerOptionClassName(
  value: SaveAssessmentCriterionStatus,
  selected: boolean,
): string {
  return joinClasses(
    "rounded-[1.3rem] border px-4 py-4 text-left transition",
    selected
      ? value === "ok"
        ? "border-[#6f8460] bg-[#edf4ea] text-[#335126]"
        : value === "notOk"
          ? "border-[#c89057] bg-[#fff4e4] text-[#7a4d16]"
          : "border-[#7992a7] bg-[#edf3f8] text-[#28465f]"
      : "border-black/10 bg-[#fbf7ef] text-slate-700 hover:border-[#8da17f] hover:bg-white",
  );
}

function getSeverityOptionClassName(
  attentionSeverity: AssessmentWalkthroughAttentionSeverity,
  selected: boolean,
): string {
  return joinClasses(
    "rounded-[1.2rem] border px-4 py-3 text-sm font-semibold transition",
    selected
      ? attentionSeverity === "large"
        ? "border-[#c89057] bg-[#fff1e2] text-[#7a4d16]"
        : attentionSeverity === "medium"
          ? "border-[#bca86d] bg-[#fff7df] text-[#75581d]"
          : "border-[#93a784] bg-[#eef4ea] text-[#355428]"
      : "border-black/10 bg-white text-slate-700 hover:border-[#8da17f]",
  );
}

function getSaveMessageClassName(state: CriterionClientState): string {
  return joinClasses(
    "text-sm leading-6",
    state.saveState === "error"
      ? "text-[#7d3211]"
      : "text-slate-600",
  );
}

function getPrimaryActionButtonClassName(disabled: boolean): string {
  return joinClasses(
    "rounded-full px-4 py-2.5 text-sm font-semibold transition",
    disabled
      ? "cursor-not-allowed border border-black/10 bg-white text-slate-400"
      : "border border-[#243026] bg-[#243026] text-white shadow-[0_10px_26px_rgba(25,31,24,0.14)] hover:bg-[#314035]",
  );
}

function getSecondaryActionButtonClassName(disabled: boolean): string {
  return joinClasses(
    "rounded-full border px-4 py-2.5 text-sm font-semibold transition",
    disabled
      ? "cursor-not-allowed border-black/10 bg-white text-slate-400"
      : "border-black/10 bg-white text-slate-700 hover:border-[#8da17f] hover:text-slate-950",
  );
}

function getTransferMessageClassName(
  status: "idle" | "transferring" | "success" | "error",
): string {
  return joinClasses(
    "text-sm leading-6",
    status === "error"
      ? "text-[#7d3211]"
      : status === "success"
        ? "text-[#355428]"
        : "text-slate-700",
  );
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
