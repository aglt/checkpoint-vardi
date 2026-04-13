"use client";

import React, { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SaveAssessmentCriterionStatus } from "@vardi/schemas";

import {
  beginCriterionSave,
  buildInitialCriterionRiskEntryStatus,
  buildInitialCriterionState,
  canPersistCriterionDraft,
  getAnsweredCount,
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
import type { AppLanguage } from "@/lib/i18n/appLanguage";
import {
  buildTransferSuccessMessage,
  getAnswerOptions,
  getAssessmentWalkthroughStaticCopy,
  getCompletedSectionsLabel,
  getCriterionAnswerAriaLabel,
  getCriterionSaveMessage,
  getProgressCountLabel,
  getSectionAnsweredCountLabel,
  getTransferButtonLabel,
  getTransferMessage,
  getTransferMetricValueLabel,
} from "@/lib/i18n/mvpCopy";
import { saveAssessmentCriterionResponseAction } from "@/lib/assessments/saveAssessmentCriterionResponseAction";
import { transferAssessmentFindingsToRiskRegisterAction } from "@/lib/assessments/transferAssessmentFindingsToRiskRegisterAction";
import { useAssessmentProgression } from "./AssessmentProgressionContext";

interface AssessmentWalkthroughProps {
  readonly assessmentId: string;
  readonly workplaceName: string;
  readonly checklistTitle: string;
  readonly checklistVersion: string;
  readonly language: AppLanguage;
  readonly riskMatrixTitle: string;
  readonly sections: readonly AssessmentSectionReadModel[];
  readonly children?: React.ReactNode;
}

export function AssessmentWalkthrough({
  assessmentId,
  workplaceName,
  checklistTitle,
  checklistVersion,
  language,
  riskMatrixTitle,
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
    sections[0]?.criteria[0]?.id ?? null,
  );
  const criterionStatesRef = useRef<CriterionStateMap>(criterionStates);

  criterionStatesRef.current = criterionStates;

  useEffect(() => {
    setRiskEntryStatusByCriterionId(buildInitialCriterionRiskEntryStatus(sections));
  }, [sections]);

  useEffect(() => {
    if (sections.some((section) => section.id === selectedSectionId)) {
      return;
    }

    setSelectedSectionId(sections[0]?.id ?? null);
  }, [sections, selectedSectionId]);

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
      findPreferredCriterionId(selectedSectionCriteria, criterionStatesRef.current),
    );
  }, [selectedCriterionId, selectedSection, selectedSectionCriteria]);

  const selectedCriterion =
    selectedSectionCriteria.find((criterion) => criterion.id === selectedCriterionId) ??
    selectedSectionCriteria[0] ??
    null;
  const selectedCriterionState = selectedCriterion
    ? criterionStates[selectedCriterion.id] ?? null
    : null;
  const walkthroughStep = progression.walkthrough;
  const riskRegisterStep = progression.riskRegister;
  const answeredCriteria = walkthroughStep.answeredCriterionCount;
  const totalCriteria = walkthroughStep.totalCriterionCount;
  const completedSections = walkthroughStep.completedSectionCount;
  const remainingCriteria = Math.max(totalCriteria - answeredCriteria, 0);
  const eligibleTransferCriteria = riskRegisterStep.eligibleFindingCount;
  const transferredCriteria = riskRegisterStep.transferredRiskEntryCount;
  const pendingTransferCriteria = riskRegisterStep.missingTransferCount;
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

  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(115,138,92,0.18),transparent_34%),linear-gradient(180deg,#f7f1e6_0%,#efe5d1_54%,#e5dcc8_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8"
      data-assessment-current-step={progression.currentStepId}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section
          className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 shadow-[0_28px_80px_rgba(28,29,24,0.12)] backdrop-blur"
          id="assessment-step-walkthrough"
        >
          <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_20rem] lg:px-8 lg:py-8">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
                  {copy.eyebrow}
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600">
                    {checklistTitle}
                  </p>
                  <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    {workplaceName}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-700">
                    {copy.description}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-black/10 bg-[#f6f1e7] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <ChecklistMetric
                    label={copy.progressLabel}
                    value={getProgressCountLabel(language, {
                      answeredCriteria,
                      totalCriteria,
                    })}
                  />
                  <ChecklistMetric
                    label={copy.summaryLabels.sectionsComplete}
                    value={getCompletedSectionsLabel(language, {
                      completedSections,
                      totalSections: sections.length,
                    })}
                  />
                  <ChecklistMetric
                    label={copy.summaryLabels.checklist}
                    value={
                      language === "is"
                        ? `${remainingCriteria} eftir`
                        : `${remainingCriteria} remaining`
                    }
                  />
                </div>
              </div>
            </div>

            <aside className="grid gap-3 self-start sm:grid-cols-3 lg:grid-cols-1">
              <SummaryCard
                label={copy.summaryLabels.checklist}
                value={`v${checklistVersion}`}
              />
              <SummaryCard
                label={copy.summaryLabels.sectionsComplete}
                value={getCompletedSectionsLabel(language, {
                  completedSections,
                  totalSections: sections.length,
                })}
              />
              <SummaryCard
                label={copy.summaryLabels.pinnedMatrix}
                value={riskMatrixTitle}
              />
            </aside>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="order-first self-start space-y-4 lg:sticky lg:top-6">
            <div className="rounded-[1.75rem] border border-black/10 bg-white/82 px-5 py-5 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {copy.checklistHeading}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {copy.checklistDescription}
                </p>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-700">
                <ChecklistMetricRow
                  label={copy.progressLabel}
                  value={getProgressCountLabel(language, {
                    answeredCriteria,
                    totalCriteria,
                  })}
                />
                <ChecklistMetricRow
                  label={copy.summaryLabels.sectionsComplete}
                  value={getCompletedSectionsLabel(language, {
                    completedSections,
                    totalSections: sections.length,
                  })}
                />
                <ChecklistMetricRow
                  label={copy.transfer.metrics.remainingToTransfer}
                  value={getTransferMetricValueLabel(pendingTransferCriteria)}
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-black/10 bg-white/82 px-5 py-5 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {copy.sectionsHeading}
                </p>
                <div className="space-y-2">
                  {sections.map((section) => {
                    const answeredCount = getAnsweredCount(
                      section.criteria,
                      criterionStates,
                    );

                    return (
                      <button
                        className={getSectionButtonClassName(
                          section.id === selectedSection?.id,
                        )}
                        data-section-id={section.id}
                        data-section-selected={
                          section.id === selectedSection?.id ? "true" : "false"
                        }
                        key={section.id}
                        onClick={() => handleSectionSelect(section.id)}
                        type="button"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {copy.sectionLabel} {String(section.order).padStart(2, "0")}
                          </div>
                          <div className="text-sm font-semibold leading-6 text-slate-950">
                            {section.translations.is.title}
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-slate-600">
                          {getSectionAnsweredCountLabel(language, {
                            answeredCount,
                            totalCount: section.criteria.length,
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedSection ? (
              <div className="rounded-[1.75rem] border border-black/10 bg-white/82 px-5 py-5 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {copy.criteriaHeading}
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    {copy.criteriaDescription}
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {selectedSection.criteria.map((criterion) => {
                    const state = criterionStates[criterion.id];

                    if (!state) {
                      return null;
                    }

                    return (
                      <button
                        className={getCriterionNavButtonClassName(
                          criterion.id === selectedCriterion?.id,
                          state,
                        )}
                        data-criterion-nav-id={criterion.id}
                        data-criterion-nav-selected={
                          criterion.id === selectedCriterion?.id ? "true" : "false"
                        }
                        data-criterion-nav-state={getCriterionNavigationState(state)}
                        key={criterion.id}
                        onClick={() => handleCriterionSelect(selectedSection.id, criterion.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 text-left">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              {copy.criterionLabel} {criterion.number}
                            </div>
                            <div className="text-sm font-semibold leading-6 text-slate-950">
                              {criterion.translations.is.title}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className={getCriterionNavStatePillClassName(state)}>
                              {getCriterionNavigationLabel(copy, state)}
                            </span>
                            {state.saved.status === "notOk" ? (
                              <TransferStatusPill
                                language={language}
                                status={
                                  riskEntryStatusByCriterionId[criterion.id] ??
                                  criterion.riskEntryStatus
                                }
                              />
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </aside>

          <div className="order-last space-y-5">
            {selectedSection && selectedCriterion && selectedCriterionState ? (
              <section className="rounded-[2rem] border border-black/10 bg-white/82 p-5 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur sm:p-6">
                <div className="flex flex-col gap-3 border-b border-black/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                      {copy.sectionLabel} {String(selectedSection.order).padStart(2, "0")}
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {selectedSection.translations.is.title}
                    </h2>
                    <p className="max-w-3xl text-sm leading-6 text-slate-600">
                      {copy.editableHint}
                    </p>
                  </div>
                  <div className="rounded-full border border-black/10 bg-[#f7f2e8] px-3 py-1.5 text-sm font-medium text-slate-700">
                    {selectedCriterionIndex + 1} / {flatCriteria.length}
                  </div>
                </div>

                <article
                  className={joinClasses(
                    getCriterionCardClassName(selectedCriterionState),
                    "mt-5",
                  )}
                  data-criterion-id={selectedCriterion.id}
                  data-selected-answer={selectedCriterionState.draft.status}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-3">
                        <div className="inline-flex w-fit items-center rounded-full border border-black/10 bg-[#f7f2e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                          {copy.criterionLabel} {selectedCriterion.number}
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold leading-8 text-slate-950">
                            {selectedCriterion.translations.is.title}
                          </h3>
                          <p className="max-w-3xl text-sm leading-6 text-slate-700">
                            {selectedCriterion.translations.is.guidance}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        {selectedCriterionState.saved.status === "notOk" ? (
                          <TransferStatusPill
                            language={language}
                            status={
                              riskEntryStatusByCriterionId[selectedCriterion.id] ??
                              selectedCriterion.riskEntryStatus
                            }
                          />
                        ) : null}
                        <SaveStatePill language={language} state={selectedCriterionState} />
                      </div>
                    </div>

                    <div
                      aria-label={getCriterionAnswerAriaLabel(
                        language,
                        selectedCriterion.number,
                      )}
                      className="grid gap-2 sm:grid-cols-3"
                      role="radiogroup"
                    >
                      {answerOptions.map((option) => (
                        <button
                          aria-checked={
                            selectedCriterionState.draft.status === option.value
                          }
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

                    <div className="flex flex-col gap-3 border-t border-black/8 pt-4">
                      <p
                        aria-live="polite"
                        className={getSaveMessageClassName(selectedCriterionState)}
                      >
                        {getCriterionSaveMessage({
                          language,
                          saveState: selectedCriterionState.saveState,
                          draftStatus: selectedCriterionState.draft.status,
                          draftNotesLength: selectedCriterionState.draft.notes.length,
                          dirty: isDirty(selectedCriterionState),
                          lastSavedAt: selectedCriterionState.lastSavedAt,
                          savedStatus: selectedCriterionState.saved.status,
                          savedNotesLength: selectedCriterionState.saved.notes.length,
                          errorMessage: selectedCriterionState.errorMessage,
                        })}
                      </p>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-2 sm:flex-row">
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
                          <button
                            className={getSecondaryActionButtonClassName(
                              nextCriterionEntry === null,
                            )}
                            disabled={nextCriterionEntry === null}
                            onClick={() => navigateToCriterion(nextCriterionEntry)}
                            type="button"
                          >
                            {copy.nextCriterion}
                          </button>
                        </div>

                        <button
                          className={getSaveActionButtonClassName(
                            !canSaveCriterion(selectedCriterionState),
                          )}
                          data-criterion-save="true"
                          disabled={!canSaveCriterion(selectedCriterionState)}
                          onClick={() => handleSave(selectedCriterion.id)}
                          type="button"
                        >
                          {getSaveActionLabel(copy, selectedCriterionState)}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </section>
            ) : null}

            <section className="rounded-[2rem] border border-black/10 bg-white/82 p-5 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {copy.transfer.eyebrow}
                  </p>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      {copy.transfer.heading}
                    </h2>
                    <p className="max-w-3xl text-sm leading-6 text-slate-600">
                      {copy.transfer.description}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                    <TransferMetric
                      label={copy.transfer.metrics.eligibleFindings}
                      value={getTransferMetricValueLabel(eligibleTransferCriteria)}
                    />
                    <TransferMetric
                      label={copy.transfer.metrics.alreadyTransferred}
                      value={getTransferMetricValueLabel(transferredCriteria)}
                    />
                    <TransferMetric
                      label={copy.transfer.metrics.remainingToTransfer}
                      value={getTransferMetricValueLabel(pendingTransferCriteria)}
                    />
                  </div>
                </div>

                <div className="w-full max-w-sm space-y-3 rounded-[1.5rem] border border-black/10 bg-[#f7f2e8] p-4">
                  <p
                    aria-live="polite"
                    className={getTransferMessageClassName(transferState.status)}
                  >
                    {getTransferMessage({
                      language,
                      status: transferState.status,
                      message: transferState.message,
                      eligibleTransferCriteria,
                      remainingCriteria: pendingTransferCriteria,
                    })}
                  </p>

                  <button
                    className={getTransferButtonClassName(
                      transferState.status === "transferring" ||
                        pendingTransferCriteria === 0,
                    )}
                    data-transfer-action="risk-register"
                    disabled={
                      transferState.status === "transferring" ||
                      pendingTransferCriteria === 0
                    }
                    onClick={handleTransferToRiskRegister}
                    type="button"
                  >
                    {getTransferButtonLabel({
                      language,
                      status: transferState.status,
                      remainingCriteria: pendingTransferCriteria,
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
      findPreferredCriterionId(section.criteria, criterionStatesRef.current),
    );
  }

  function handleCriterionSelect(sectionId: string, criterionId: string) {
    setSelectedSectionId(sectionId);
    setSelectedCriterionId(criterionId);
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

  function updateCriterionState(
    criterionId: string,
    updater: (currentState: CriterionClientState) => CriterionClientState,
  ) {
    setCriterionStates((current) => {
      const criterionState = current[criterionId];

      if (!criterionState) {
        return current;
      }

      const nextState = {
        ...current,
        [criterionId]: updater(criterionState),
      };

      criterionStatesRef.current = nextState;
      return nextState;
    });
  }

  function handleStatusSelect(
    criterionId: string,
    status: SaveAssessmentCriterionStatus,
  ) {
    updateCriterionState(criterionId, (criterionState) => ({
      ...criterionState,
      draft: {
        ...criterionState.draft,
        status,
      },
      saveState: criterionState.saveState === "error" ? "idle" : criterionState.saveState,
      errorMessage: null,
    }));
  }

  function handleNotesChange(criterionId: string, notes: string) {
    updateCriterionState(criterionId, (criterionState) => ({
      ...updateCriterionDraftNotes(
        { [criterionId]: criterionState },
        criterionId,
        notes,
      )[criterionId],
    }));
  }

  function handleSave(criterionId: string) {
    const criterionState = criterionStatesRef.current[criterionId];

    if (!criterionState || !canPersistCriterionDraft(criterionState.draft)) {
      return;
    }

    persistCriterion(criterionId, criterionState.draft);
  }

  function handleTransferToRiskRegister() {
    if (transferState.status === "transferring" || pendingTransferCriteria === 0) {
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

  function persistCriterion(criterionId: string, nextDraft: CriterionDraft) {
    if (!canPersistCriterionDraft(nextDraft)) {
      return;
    }

    const startedSave = beginCriterionSave(
      criterionStatesRef.current,
      criterionId,
      nextDraft,
    );
    const nextRequestId = startedSave.requestId;

    if (nextRequestId === 0) {
      return;
    }

    criterionStatesRef.current = startedSave.criterionStates;
    setCriterionStates(startedSave.criterionStates);

    startTransition(async () => {
      try {
        const response = await saveAssessmentCriterionResponseAction({
          assessmentId,
          input: {
            criterionId,
            status: nextDraft.status,
            notes: nextDraft.notes,
          },
        });

        startTransition(() => {
          setCriterionStates((current) => {
            const nextState = reconcileCriterionSaveSuccess(
              current,
              criterionId,
              nextRequestId,
              response,
              nextDraft,
            );

            criterionStatesRef.current = nextState;
            return nextState;
          });
        });
        await refreshProgression();
      } catch (error: unknown) {
        startTransition(() => {
          setCriterionStates((current) => {
            const nextState = reconcileCriterionSaveFailure(
              current,
              criterionId,
              nextRequestId,
              copy.fallbacks.criterionSave,
            );

            criterionStatesRef.current = nextState;
            return nextState;
          });
        });
      }
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

function ChecklistMetric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-black/8 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold leading-6 text-slate-950">
        {value}
      </div>
    </div>
  );
}

function ChecklistMetricRow({
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

function SaveStatePill({
  language,
  state,
}: {
  readonly language: AppLanguage;
  readonly state: CriterionClientState;
}) {
  const copy = getAssessmentWalkthroughStaticCopy(language);

  return (
    <div className={getSavePillClassName(state)}>
      {state.saveState === "saving"
        ? copy.savePills.saving
        : state.saveState === "error"
          ? copy.savePills.error
          : state.draft.status === "unanswered" && state.draft.notes.length > 0
            ? copy.savePills.needsAnswer
            : isDirty(state)
              ? copy.savePills.unsaved
              : state.saved.status === "unanswered" && state.saved.notes.length === 0
                ? copy.savePills.notStarted
                : copy.savePills.saved}
    </div>
  );
}

function TransferStatusPill({
  language,
  status,
}: {
  readonly language: AppLanguage;
  readonly status: PresenceStatus;
}) {
  const copy = getAssessmentWalkthroughStaticCopy(language);

  return (
    <div className={getTransferPillClassName(status)} data-transfer-state={status}>
      {status === "present"
        ? copy.transferPills.present
        : copy.transferPills.absent}
    </div>
  );
}

function findPreferredCriterionId(
  criteria: readonly AssessmentSectionReadModel["criteria"][number][],
  criterionStates: CriterionStateMap,
): string | null {
  const dirtyCriterion = criteria.find((criterion) => {
    const state = criterionStates[criterion.id];
    return state ? isDirty(state) : false;
  });

  if (dirtyCriterion) {
    return dirtyCriterion.id;
  }

  const unansweredCriterion = criteria.find((criterion) => {
    const state = criterionStates[criterion.id];
    return state?.saved.status === "unanswered";
  });

  if (unansweredCriterion) {
    return unansweredCriterion.id;
  }

  return criteria[0]?.id ?? null;
}

type CriterionNavigationState =
  | "error"
  | "needsAnswer"
  | "unsaved"
  | "notStarted"
  | "saved";

function getCriterionNavigationState(
  state: CriterionClientState,
): CriterionNavigationState {
  if (state.saveState === "error") {
    return "error";
  }

  if (state.draft.status === "unanswered" && state.draft.notes.length > 0) {
    return "needsAnswer";
  }

  if (isDirty(state)) {
    return "unsaved";
  }

  if (state.saved.status === "unanswered" && state.saved.notes.length === 0) {
    return "notStarted";
  }

  return "saved";
}

function getCriterionNavigationLabel(
  copy: ReturnType<typeof getAssessmentWalkthroughStaticCopy>,
  state: CriterionClientState,
): string {
  switch (getCriterionNavigationState(state)) {
    case "error":
      return copy.savePills.error;
    case "needsAnswer":
      return copy.savePills.needsAnswer;
    case "unsaved":
      return copy.savePills.unsaved;
    case "notStarted":
      return copy.savePills.notStarted;
    case "saved":
      return copy.savePills.saved;
  }

  return copy.savePills.saved;
}

function canSaveCriterion(state: CriterionClientState): boolean {
  if (state.saveState === "saving") {
    return false;
  }

  if (!canPersistCriterionDraft(state.draft)) {
    return false;
  }

  return isDirty(state) || state.saveState === "error";
}

function getSaveActionLabel(
  copy: ReturnType<typeof getAssessmentWalkthroughStaticCopy>,
  state: CriterionClientState,
): string {
  if (state.saveState === "saving") {
    return copy.savePills.saving;
  }

  if (state.saveState === "error") {
    return copy.retrySave;
  }

  return copy.saveAction;
}

function getSectionButtonClassName(selected: boolean): string {
  return joinClasses(
    "w-full rounded-[1.3rem] border px-4 py-4 text-left transition",
    selected
      ? "border-[#6f8460] bg-[#edf4ea] shadow-[0_14px_30px_rgba(43,67,31,0.08)]"
      : "border-black/10 bg-[#fbf7ef] hover:border-[#8da17f] hover:bg-white",
  );
}

function getCriterionNavButtonClassName(
  selected: boolean,
  state: CriterionClientState,
): string {
  return joinClasses(
    "w-full rounded-[1.2rem] border px-4 py-3 text-left transition",
    selected
      ? "border-[#6f8460] bg-[#eef5e9]"
      : state.saveState === "error"
        ? "border-[#bb6b4b] bg-[#fff4ed]"
        : isDirty(state)
          ? "border-[#9aa986] bg-[#faf7ef]"
          : "border-black/10 bg-[#fbf7ef] hover:border-[#8da17f] hover:bg-white",
  );
}

function getCriterionNavStatePillClassName(state: CriterionClientState): string {
  return joinClasses(
    "inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
    state.saveState === "error"
      ? "border-[#bb6b4b] bg-[#fff1e8] text-[#7d3211]"
      : isDirty(state)
        ? "border-[#8a7d6a] bg-[#f3eee5] text-[#564938]"
        : "border-black/10 bg-white text-slate-600",
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

function getSaveMessageClassName(state: CriterionClientState): string {
  return joinClasses(
    "text-sm leading-6",
    state.saveState === "error" ? "text-[#8a2f0d]" : "text-slate-600",
  );
}

function getSecondaryActionButtonClassName(disabled: boolean): string {
  return joinClasses(
    "rounded-full border px-4 py-2.5 text-sm font-semibold transition",
    disabled
      ? "cursor-not-allowed border-black/10 bg-[#ebe4d7] text-slate-500"
      : "border-black/10 bg-white text-slate-900 hover:border-slate-400",
  );
}

function getSaveActionButtonClassName(disabled: boolean): string {
  return joinClasses(
    "rounded-full px-5 py-2.5 text-sm font-semibold transition",
    disabled
      ? "cursor-not-allowed border border-black/10 bg-[#ebe4d7] text-slate-500"
      : "border border-[#243026] bg-[#243026] text-white shadow-[0_12px_28px_rgba(25,31,24,0.16)] hover:bg-[#314035]",
  );
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

function joinClasses(
  ...classNames: ReadonlyArray<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}
