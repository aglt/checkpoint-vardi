"use client";

import React, { startTransition, useEffect, useRef, useState } from "react";

import {
  addRiskMitigationActionDraft,
  beginRiskMitigationActionDelete,
  beginRiskMitigationActionSave,
  buildInitialRiskMitigationActionState,
  canPersistRiskMitigationActionDraft,
  isRiskMitigationActionDirty,
  reconcileRiskMitigationActionDeleteFailure,
  reconcileRiskMitigationActionDeleteSuccess,
  reconcileRiskMitigationActionSaveFailure,
  reconcileRiskMitigationActionSaveSuccess,
  removeUnsavedRiskMitigationActionDraft,
  updateRiskMitigationActionDraftField,
  type RiskMitigationActionClientState,
  type RiskMitigationActionDraft,
  type RiskMitigationActionStateMap,
} from "@/lib/assessments/assessmentRiskMitigationController";
import {
  beginRiskEntrySave,
  buildInitialRiskEntryState,
  canPersistRiskEntryDraft,
  isRiskEntryDirty,
  reconcileRiskEntrySaveFailure,
  reconcileRiskEntrySaveSuccess,
  updateRiskEntryDraftField,
  type RiskEntryClientState,
  type RiskEntryDraft,
  type RiskEntryStateMap,
} from "@/lib/assessments/assessmentRiskRegisterController";
import type { AppLanguage } from "@/lib/i18n/appLanguage";
import {
  getAssessmentProgressionBlockerMessages,
  getAssessmentProgressionGuidanceMessage,
  getAssessmentProgressionStatusLabel,
  getRiskEntrySaveMessage,
  getRiskLevelLabel,
  getRiskMitigationActionCardEyebrow,
  getRiskMitigationActionDeleteButtonLabel,
  getRiskMitigationActionMessage,
  getRiskMitigationActionSaveButtonLabel,
  getRiskSeverityChoiceOptionLabel,
  getRiskMitigationActionStatePillLabel,
  getRiskMitigationActionStatusLabel,
  getRiskRegisterClassificationMessage,
  getRiskRegisterStaticCopy,
  getTransferredEntryCountLabel,
} from "@/lib/i18n/mvpCopy";
import { createAssessmentRiskMitigationActionAction } from "@/lib/assessments/createAssessmentRiskMitigationActionAction";
import { deleteAssessmentRiskMitigationActionAction } from "@/lib/assessments/deleteAssessmentRiskMitigationActionAction";
import type {
  AssessmentRiskRegisterEntryProjection,
  AssessmentRiskSeverityChoiceGroupProjection,
} from "@/lib/assessments/loadAssessmentRiskRegisterProjection";
import { saveAssessmentRiskEntryAction } from "@/lib/assessments/saveAssessmentRiskEntryAction";
import { updateAssessmentRiskMitigationActionAction } from "@/lib/assessments/updateAssessmentRiskMitigationActionAction";
import { useAssessmentProgression } from "./AssessmentProgressionContext";

interface RiskRegisterEditorProps {
  readonly assessmentId: string;
  readonly language: AppLanguage;
  readonly riskMatrixTitle: string;
  readonly riskMatrixSeverityChoices: readonly AssessmentRiskSeverityChoiceGroupProjection[];
  readonly entries: readonly AssessmentRiskRegisterEntryProjection[];
}

export function RiskRegisterEditor({
  assessmentId,
  language,
  riskMatrixTitle,
  riskMatrixSeverityChoices,
  entries,
}: RiskRegisterEditorProps) {
  const { progression, refreshProgression, refreshSummary } =
    useAssessmentProgression();
  const copy = getRiskRegisterStaticCopy(language);
  const [riskEntryStates, setRiskEntryStates] = useState<RiskEntryStateMap>(() =>
    buildInitialRiskEntryState(entries),
  );
  const [mitigationActionStates, setMitigationActionStates] =
    useState<RiskMitigationActionStateMap>(() =>
      buildInitialRiskMitigationActionState(entries),
    );
  const riskEntryStatesRef = useRef<RiskEntryStateMap>(riskEntryStates);
  const mitigationActionStatesRef =
    useRef<RiskMitigationActionStateMap>(mitigationActionStates);

  riskEntryStatesRef.current = riskEntryStates;
  mitigationActionStatesRef.current = mitigationActionStates;

  useEffect(() => {
    setRiskEntryStates(buildInitialRiskEntryState(entries));
    setMitigationActionStates(buildInitialRiskMitigationActionState(entries));
  }, [entries]);
  const step = progression.riskRegister;
  const blockerMessages = getAssessmentProgressionBlockerMessages(
    language,
    step.blockers,
  );

  return (
    <section
      className="rounded-[2rem] border border-black/10 bg-white/82 p-4 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur sm:p-5 lg:p-6"
      data-step-availability={step.availability}
      data-step-completion={step.completionState}
      id="assessment-step-riskRegister"
    >
      <div className="flex flex-col gap-3 border-b border-black/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
            {copy.eyebrow}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            {copy.heading}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-700">
            {copy.description} {riskMatrixTitle}.
          </p>
        </div>
        <div className="rounded-full border border-black/10 bg-[#f7f2e8] px-3 py-1.5 text-sm font-medium text-slate-700">
          {getTransferredEntryCountLabel(language, entries.length)}
        </div>
      </div>

      <div className={getStepBannerClassName(step.availability)}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={getStepBannerPillClassName(step.availability)}>
            {getAssessmentProgressionStatusLabel({
              language,
              step,
              currentStepId: progression.currentStepId,
            })}
          </span>
          <p className="text-sm leading-6 text-slate-700">
            {getAssessmentProgressionGuidanceMessage({
              language,
              step,
              currentStepId: progression.currentStepId,
            })}
          </p>
        </div>
        {blockerMessages.length > 0 ? (
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {blockerMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 rounded-[1.75rem] border border-dashed border-black/12 bg-[#fbf7ef] px-5 py-6 text-sm leading-6 text-slate-600">
          {copy.emptyState}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {entries.map((entry) => {
            const riskEntryState = riskEntryStates[entry.id];
            const riskMitigationStates = mitigationActionStates[entry.id] ?? [];

            if (!riskEntryState) {
              return null;
            }

            const hasSeveritySelection =
              riskEntryState.draft.likelihood != null &&
              riskEntryState.draft.consequence != null;

            return (
              <article
                className={getRiskEntryCardClassName(riskEntryState)}
                data-classification-state={riskEntryState.savedClassificationState}
                data-risk-entry-id={entry.id}
                data-risk-level={riskEntryState.savedRiskLevel ?? "incomplete"}
                key={entry.id}
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex w-fit items-center rounded-full border border-black/10 bg-[#f7f2e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                          {copy.labels.criterion} {entry.criterionNumber}
                        </span>
                        <span className="inline-flex w-fit items-center rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          {entry.sectionTitle}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                          {entry.criterionTitle}
                        </h3>
                        <p className="max-w-3xl text-sm leading-6 text-slate-700">
                          {copy.transferredFromWalkthrough}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 lg:items-end">
                      <RiskLevelBadge language={language} state={riskEntryState} />
                      <RiskEntrySaveStatePill language={language} state={riskEntryState} />
                    </div>
                  </div>

                  {riskEntryState.savedClassificationState !== "ready" ? (
                    <div className="rounded-[1.4rem] border border-[#d8b46c] bg-[#fff6de] px-4 py-3 text-sm leading-6 text-[#6a4a05]">
                      {getRiskRegisterClassificationMessage({
                        language,
                        state: riskEntryState.savedClassificationState,
                      })}
                    </div>
                  ) : null}

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-slate-900"
                          htmlFor={`hazard-${entry.id}`}
                        >
                          {copy.labels.hazard}
                        </label>
                        <textarea
                          className="min-h-24 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                          data-field="hazard"
                          id={`hazard-${entry.id}`}
                          onChange={(event) =>
                            handleRiskEntryFieldChange(
                              entry.id,
                              "hazard",
                              event.target.value,
                            )
                          }
                          placeholder={copy.placeholders.hazard}
                          value={riskEntryState.draft.hazard}
                        />
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            className="text-sm font-medium text-slate-900"
                            htmlFor={`health-effects-${entry.id}`}
                          >
                            {copy.labels.healthEffects}
                          </label>
                          <textarea
                            className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                            id={`health-effects-${entry.id}`}
                            onChange={(event) =>
                              handleRiskEntryFieldChange(
                                entry.id,
                                "healthEffects",
                                event.target.value,
                              )
                            }
                            placeholder={copy.placeholders.healthEffects}
                            value={riskEntryState.draft.healthEffects}
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                            className="text-sm font-medium text-slate-900"
                            htmlFor={`who-at-risk-${entry.id}`}
                          >
                            {copy.labels.whoAtRisk}
                          </label>
                          <textarea
                            className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                            id={`who-at-risk-${entry.id}`}
                            onChange={(event) =>
                              handleRiskEntryFieldChange(
                                entry.id,
                                "whoAtRisk",
                                event.target.value,
                              )
                            }
                            placeholder={copy.placeholders.whoAtRisk}
                            value={riskEntryState.draft.whoAtRisk}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-slate-900"
                          htmlFor={`current-controls-${entry.id}`}
                        >
                          {copy.labels.currentControls}
                        </label>
                        <textarea
                          className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                          id={`current-controls-${entry.id}`}
                          onChange={(event) =>
                            handleRiskEntryFieldChange(
                              entry.id,
                              "currentControls",
                              event.target.value,
                            )
                          }
                          placeholder={copy.placeholders.currentControls}
                          value={riskEntryState.draft.currentControls}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.75rem] border border-black/10 bg-[#f8f2e7] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h4 className="text-base font-semibold text-slate-950">
                                {copy.labels.classification}
                              </h4>
                              <p className="text-sm leading-6 text-slate-600">
                                {copy.classificationDescription}
                              </p>
                            </div>
                            {hasSeveritySelection ? (
                              <button
                                className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-900"
                                onClick={() => handleRiskSeverityClear(entry.id)}
                                type="button"
                              >
                                {copy.clear}
                              </button>
                            ) : null}
                          </div>

                          <div className="grid gap-3">
                            {riskMatrixSeverityChoices.map((severityChoice) => (
                              <SeverityChoiceGroup
                                group={severityChoice}
                                key={severityChoice.riskLevel}
                                language={language}
                                onSelect={(likelihood, consequence) =>
                                  handleRiskSeveritySelect(
                                    entry.id,
                                    likelihood,
                                    consequence,
                                  )
                                }
                                selectedConsequence={riskEntryState.draft.consequence}
                                selectedLikelihood={riskEntryState.draft.likelihood}
                              />
                            ))}
                          </div>

                          <div className="space-y-2">
                            <label
                              className="text-sm font-medium text-slate-900"
                              htmlFor={`classification-reasoning-${entry.id}`}
                            >
                              {copy.labels.classificationReasoning}
                            </label>
                            <textarea
                              className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                              id={`classification-reasoning-${entry.id}`}
                              onChange={(event) =>
                                handleRiskEntryFieldChange(
                                  entry.id,
                                  "classificationReasoning",
                                  event.target.value,
                                )
                              }
                              placeholder={copy.placeholders.classificationReasoning}
                              value={riskEntryState.draft.classificationReasoning}
                            />
                          </div>
                        </div>
                      </div>

                      <FieldGroup
                        id={`cost-estimate-${entry.id}`}
                        label={copy.labels.costEstimate}
                      >
                        <input
                          className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                          id={`cost-estimate-${entry.id}`}
                          min={0}
                          onChange={(event) =>
                            handleRiskEntryFieldChange(
                              entry.id,
                              "costEstimate",
                              event.target.value,
                            )
                          }
                          placeholder={copy.placeholders.costEstimate}
                          type="number"
                          value={riskEntryState.draft.costEstimate}
                        />
                      </FieldGroup>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-black/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p
                      aria-live="polite"
                      className={getRiskEntrySaveMessageClassName(riskEntryState)}
                    >
                      {getRiskEntrySaveMessage({
                        language,
                        saveState: riskEntryState.saveState,
                        dirty: isRiskEntryDirty(riskEntryState),
                        canPersist: canPersistRiskEntryDraft(riskEntryState.draft),
                        savedRiskLevel: riskEntryState.savedRiskLevel,
                        classificationState: riskEntryState.savedClassificationState,
                        errorMessage: riskEntryState.errorMessage,
                      })}
                    </p>
                    <button
                      className={getPrimaryButtonClassName(
                        riskEntryState.saveState === "saving" ||
                          !isRiskEntryDirty(riskEntryState),
                      )}
                      data-risk-entry-save-button="true"
                      disabled={
                        riskEntryState.saveState === "saving" ||
                        !isRiskEntryDirty(riskEntryState)
                      }
                      onClick={() => handleRiskEntrySave(entry.id)}
                      type="button"
                    >
                      {riskEntryState.saveState === "saving"
                        ? copy.saveButtonSaving
                        : copy.saveButton}
                    </button>
                  </div>

                  <section className="rounded-[1.75rem] border border-black/10 bg-[#f8f5ee] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-5">
                    <div className="flex flex-col gap-3 border-b border-black/8 pb-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <h4 className="text-base font-semibold text-slate-950">
                          {copy.mitigation.heading}
                        </h4>
                        <p className="max-w-2xl text-sm leading-6 text-slate-600">
                          {copy.mitigation.description}
                        </p>
                      </div>
                      <button
                        className={getSecondaryButtonClassName(false)}
                        onClick={() => handleAddMitigationActionDraft(entry.id)}
                        type="button"
                      >
                        {copy.mitigation.addAction}
                      </button>
                    </div>

                    {riskMitigationStates.length === 0 ? (
                      <div className="mt-4 rounded-[1.4rem] border border-dashed border-black/12 bg-white/70 px-4 py-4 text-sm leading-6 text-slate-600">
                        {copy.mitigation.emptyState}
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {riskMitigationStates.map((actionState, index) => (
                          <article
                            className={getRiskMitigationActionCardClassName(actionState)}
                            data-mitigation-action-id={
                              actionState.persistedId ?? actionState.clientId
                            }
                            data-mitigation-action-origin={
                              actionState.persistedId ? "saved" : "draft"
                            }
                            data-mitigation-action-status={actionState.draft.status}
                            key={actionState.clientId}
                          >
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    {getRiskMitigationActionCardEyebrow({
                                      language,
                                      persisted: actionState.persistedId != null,
                                      index,
                                    })}
                                  </p>
                                  <p className="text-sm leading-6 text-slate-600">
                                    {copy.mitigation.cardHelper}
                                  </p>
                                </div>
                                <RiskMitigationActionStatePill
                                  language={language}
                                  state={actionState}
                                />
                              </div>

                              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                                <FieldGroup
                                  id={`mitigation-description-${actionState.clientId}`}
                                  label={copy.labels.mitigationDescription}
                                >
                                  <textarea
                                    className="min-h-24 w-full rounded-[1.2rem] border border-black/10 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                                    id={`mitigation-description-${actionState.clientId}`}
                                    onChange={(event) =>
                                      handleRiskMitigationActionFieldChange(
                                        entry.id,
                                        actionState.clientId,
                                        "description",
                                        event.target.value,
                                      )
                                    }
                                    placeholder={copy.placeholders.mitigationDescription}
                                    value={actionState.draft.description}
                                  />
                                </FieldGroup>

                                <div className="grid gap-4 sm:grid-cols-2">
                                  <FieldGroup
                                    id={`mitigation-assignee-${actionState.clientId}`}
                                    label={copy.labels.mitigationAssignee}
                                  >
                                    <input
                                      className="w-full rounded-[1.1rem] border border-black/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                                      id={`mitigation-assignee-${actionState.clientId}`}
                                      onChange={(event) =>
                                        handleRiskMitigationActionFieldChange(
                                          entry.id,
                                          actionState.clientId,
                                          "assigneeName",
                                          event.target.value,
                                        )
                                      }
                                      placeholder={copy.placeholders.mitigationAssignee}
                                      type="text"
                                      value={actionState.draft.assigneeName}
                                    />
                                  </FieldGroup>

                                  <FieldGroup
                                    id={`mitigation-due-date-${actionState.clientId}`}
                                    label={copy.labels.mitigationDueDate}
                                  >
                                    <input
                                      className="w-full rounded-[1.1rem] border border-black/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                                      id={`mitigation-due-date-${actionState.clientId}`}
                                      onChange={(event) =>
                                        handleRiskMitigationActionFieldChange(
                                          entry.id,
                                          actionState.clientId,
                                          "dueDate",
                                          event.target.value,
                                        )
                                      }
                                      type="date"
                                      value={actionState.draft.dueDate}
                                    />
                                  </FieldGroup>

                                  <FieldGroup
                                    id={`mitigation-status-${actionState.clientId}`}
                                    label={copy.labels.mitigationStatus}
                                  >
                                    <select
                                      className="w-full rounded-[1.1rem] border border-black/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                                      id={`mitigation-status-${actionState.clientId}`}
                                      onChange={(event) =>
                                        handleRiskMitigationActionFieldChange(
                                          entry.id,
                                          actionState.clientId,
                                          "status",
                                          event.target.value as RiskMitigationActionDraft["status"],
                                        )
                                      }
                                      value={actionState.draft.status}
                                    >
                                      <option value="open">
                                        {getRiskMitigationActionStatusLabel(
                                          language,
                                          "open",
                                        )}
                                      </option>
                                      <option value="inProgress">
                                        {getRiskMitigationActionStatusLabel(
                                          language,
                                          "inProgress",
                                        )}
                                      </option>
                                      <option value="done">
                                        {getRiskMitigationActionStatusLabel(
                                          language,
                                          "done",
                                        )}
                                      </option>
                                    </select>
                                  </FieldGroup>
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 border-t border-black/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <p
                                  aria-live="polite"
                                  className={getRiskMitigationActionMessageClassName(actionState)}
                                >
                                  {getRiskMitigationActionMessage({
                                    language,
                                    persisted: actionState.persistedId != null,
                                    dirty: isRiskMitigationActionDirty(actionState),
                                    canPersist: canPersistRiskMitigationActionDraft(
                                      actionState.draft,
                                    ),
                                    saveState: actionState.saveState,
                                    status: actionState.draft.status,
                                    errorMessage: actionState.errorMessage,
                                  })}
                                </p>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                  <button
                                    className={getSecondaryButtonClassName(
                                      actionState.saveState === "saving" ||
                                        actionState.saveState === "deleting",
                                    )}
                                    disabled={
                                      actionState.saveState === "saving" ||
                                      actionState.saveState === "deleting"
                                    }
                                    onClick={() =>
                                      handleRiskMitigationActionDelete(
                                        entry.id,
                                        actionState.clientId,
                                      )
                                    }
                                    type="button"
                                  >
                                    {getRiskMitigationActionDeleteButtonLabel({
                                      language,
                                      persisted: actionState.persistedId != null,
                                      saveState: actionState.saveState,
                                    })}
                                  </button>
                                  <button
                                    className={getPrimaryButtonClassName(
                                      actionState.saveState === "saving" ||
                                        actionState.saveState === "deleting" ||
                                        !isRiskMitigationActionDirty(actionState) ||
                                        !canPersistRiskMitigationActionDraft(
                                          actionState.draft,
                                        ),
                                    )}
                                    disabled={
                                      actionState.saveState === "saving" ||
                                      actionState.saveState === "deleting" ||
                                      !isRiskMitigationActionDirty(actionState) ||
                                      !canPersistRiskMitigationActionDraft(
                                        actionState.draft,
                                      )
                                    }
                                    onClick={() =>
                                      handleRiskMitigationActionSave(
                                        entry.id,
                                        actionState.clientId,
                                      )
                                    }
                                    type="button"
                                  >
                                    {getRiskMitigationActionSaveButtonLabel({
                                      language,
                                      persisted: actionState.persistedId != null,
                                      saveState: actionState.saveState,
                                    })}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  function handleRiskEntryFieldChange<Field extends keyof RiskEntryDraft>(
    riskEntryId: string,
    field: Field,
    value: RiskEntryDraft[Field],
  ) {
    setRiskEntryStates((current) =>
      updateRiskEntryDraftField(current, riskEntryId, field, value),
    );
  }

  function handleRiskMitigationActionFieldChange<
    Field extends keyof RiskMitigationActionDraft,
  >(
    riskEntryId: string,
    clientId: string,
    field: Field,
    value: RiskMitigationActionDraft[Field],
  ) {
    setMitigationActionStates((current) =>
      updateRiskMitigationActionDraftField(
        current,
        riskEntryId,
        clientId,
        field,
        value,
      ),
    );
  }

  function handleAddMitigationActionDraft(riskEntryId: string) {
    setMitigationActionStates((current) =>
      addRiskMitigationActionDraft(current, riskEntryId),
    );
  }

  function handleRiskSeveritySelect(
    riskEntryId: string,
    likelihood: number,
    consequence: number,
  ) {
    setRiskEntryStates((current) => {
      const nextStates = updateRiskEntryDraftField(
        current,
        riskEntryId,
        "likelihood",
        likelihood,
      );

      return updateRiskEntryDraftField(
        nextStates,
        riskEntryId,
        "consequence",
        consequence,
      );
    });
  }

  function handleRiskSeverityClear(riskEntryId: string) {
    setRiskEntryStates((current) => {
      const nextStates = updateRiskEntryDraftField(
        current,
        riskEntryId,
        "likelihood",
        null,
      );

      return updateRiskEntryDraftField(
        nextStates,
        riskEntryId,
        "consequence",
        null,
      );
    });
  }

  function handleRiskEntrySave(riskEntryId: string) {
    const riskEntryState = riskEntryStatesRef.current[riskEntryId];

    if (!riskEntryState) {
      return;
    }

    if (!canPersistRiskEntryDraft(riskEntryState.draft)) {
      const errorMessage =
        language === "is"
          ? "Hætta er nauðsynleg áður en hægt er að vista þessa færslu."
          : "Hazard is required before saving this risk entry.";

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
            errorMessage,
          },
        };
      });
      return;
    }

    persistRiskEntry(riskEntryId, riskEntryState.draft);
  }

  function handleRiskMitigationActionSave(
    riskEntryId: string,
    clientId: string,
  ) {
    const actionState = (mitigationActionStatesRef.current[riskEntryId] ?? []).find(
      (state) => state.clientId === clientId,
    );

    if (!actionState) {
      return;
    }

    if (!canPersistRiskMitigationActionDraft(actionState.draft)) {
      setMitigationActionStates((current) => {
        const startedSave = beginRiskMitigationActionSave(
          current,
          riskEntryId,
          clientId,
        );

        return reconcileRiskMitigationActionSaveFailure(
          startedSave.actionStates,
          riskEntryId,
          clientId,
          startedSave.requestId,
          copy.mitigation.descriptionRequired,
        );
      });
      return;
    }

    persistRiskMitigationAction(riskEntryId, clientId, actionState);
  }

  function handleRiskMitigationActionDelete(
    riskEntryId: string,
    clientId: string,
  ) {
    const actionState = (mitigationActionStatesRef.current[riskEntryId] ?? []).find(
      (state) => state.clientId === clientId,
    );

    if (!actionState) {
      return;
    }

    if (!actionState.persistedId) {
      setMitigationActionStates((current) =>
        removeUnsavedRiskMitigationActionDraft(current, riskEntryId, clientId),
      );
      return;
    }

    const startedDelete = beginRiskMitigationActionDelete(
      mitigationActionStatesRef.current,
      riskEntryId,
      clientId,
    );
    const nextRequestId = startedDelete.requestId;

    if (nextRequestId === 0) {
      return;
    }

    mitigationActionStatesRef.current = startedDelete.actionStates;
    setMitigationActionStates(startedDelete.actionStates);

    startTransition(async () => {
      try {
        await deleteAssessmentRiskMitigationActionAction({
          assessmentId,
          input: {
            mitigationActionId: actionState.persistedId!,
          },
        });

        startTransition(() => {
          setMitigationActionStates((current) =>
            reconcileRiskMitigationActionDeleteSuccess(
              current,
              riskEntryId,
              clientId,
              nextRequestId,
            ),
          );
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : copy.mitigation.fallbacks.delete;

        startTransition(() => {
          setMitigationActionStates((current) =>
            reconcileRiskMitigationActionDeleteFailure(
              current,
              riskEntryId,
              clientId,
              nextRequestId,
              errorMessage,
            ),
          );
        });
      }
    });
  }

  function persistRiskEntry(riskEntryId: string, nextDraft: RiskEntryDraft) {
    const startedSave = beginRiskEntrySave(
      riskEntryStatesRef.current,
      riskEntryId,
    );
    const nextRequestId = startedSave.requestId;

    if (nextRequestId === 0) {
      return;
    }

    riskEntryStatesRef.current = startedSave.riskEntryStates;
    setRiskEntryStates(startedSave.riskEntryStates);

    startTransition(async () => {
      try {
        const response = await saveAssessmentRiskEntryAction({
          assessmentId,
          input: {
            riskEntryId,
            hazard: nextDraft.hazard,
            healthEffects: toOptionalString(nextDraft.healthEffects),
            whoAtRisk: toOptionalString(nextDraft.whoAtRisk),
            likelihood: nextDraft.likelihood ?? undefined,
            consequence: nextDraft.consequence ?? undefined,
            classificationReasoning: toOptionalString(
              nextDraft.classificationReasoning,
            ),
            currentControls: toOptionalString(nextDraft.currentControls),
            costEstimate: toOptionalInteger(nextDraft.costEstimate),
          },
        });

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
        await Promise.all([refreshProgression(), refreshSummary()]);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : copy.fallbacks.save;

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
      }
    });
  }

  function persistRiskMitigationAction(
    riskEntryId: string,
    clientId: string,
    actionState: RiskMitigationActionClientState,
  ) {
    const startedSave = beginRiskMitigationActionSave(
      mitigationActionStatesRef.current,
      riskEntryId,
      clientId,
    );
    const nextRequestId = startedSave.requestId;

    if (nextRequestId === 0) {
      return;
    }

    mitigationActionStatesRef.current = startedSave.actionStates;
    setMitigationActionStates(startedSave.actionStates);

    startTransition(async () => {
      try {
        const response = actionState.persistedId
          ? await updateAssessmentRiskMitigationActionAction({
              assessmentId,
              input: {
                mitigationActionId: actionState.persistedId,
                description: actionState.draft.description,
                assigneeName: toOptionalString(actionState.draft.assigneeName),
                dueDate: toOptionalString(actionState.draft.dueDate),
                status: actionState.draft.status,
              },
            })
          : await createAssessmentRiskMitigationActionAction({
              assessmentId,
              input: {
                riskEntryId,
                description: actionState.draft.description,
                assigneeName: toOptionalString(actionState.draft.assigneeName),
                dueDate: toOptionalString(actionState.draft.dueDate),
                status: actionState.draft.status,
              },
            });

        startTransition(() => {
          setMitigationActionStates((current) =>
            reconcileRiskMitigationActionSaveSuccess(
              current,
              riskEntryId,
              clientId,
              nextRequestId,
              response,
              actionState.draft,
            ),
          );
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : copy.mitigation.fallbacks.save;

        startTransition(() => {
          setMitigationActionStates((current) =>
            reconcileRiskMitigationActionSaveFailure(
              current,
              riskEntryId,
              clientId,
              nextRequestId,
              errorMessage,
            ),
          );
        });
      }
    });
  }
}

function RiskEntrySaveStatePill({
  language,
  state,
}: {
  readonly language: AppLanguage;
  readonly state: RiskEntryClientState;
}) {
  return (
    <div className={getRiskEntrySavePillClassName(state)}>
      {state.saveState === "saving"
        ? getRiskRegisterStaticCopy(language).savePills.saving
        : state.saveState === "error"
          ? getRiskRegisterStaticCopy(language).savePills.error
          : isRiskEntryDirty(state)
            ? getRiskRegisterStaticCopy(language).savePills.unsaved
            : getRiskRegisterStaticCopy(language).savePills.saved}
    </div>
  );
}

function RiskMitigationActionStatePill({
  language,
  state,
}: {
  readonly language: AppLanguage;
  readonly state: RiskMitigationActionClientState;
}) {
  return (
    <div className={getRiskMitigationActionStatePillClassName(state)}>
      {getRiskMitigationActionStatePillLabel({
        language,
        persisted: state.persistedId != null,
        dirty: isRiskMitigationActionDirty(state),
        saveState: state.saveState,
      })}
    </div>
  );
}

function RiskLevelBadge({
  language,
  state,
}: {
  readonly language: AppLanguage;
  readonly state: RiskEntryClientState;
}) {
  const dirty = isRiskEntryDirty(state);
  const label =
    state.savedClassificationState !== "ready" && !dirty
      ? getRiskRegisterStaticCopy(language).riskLevel.needsRepair
      : state.savedRiskLevel
        ? getRiskLevelLabel(language, state.savedRiskLevel)
        : getRiskRegisterStaticCopy(language).riskLevel.incomplete;

  return (
    <div
      className={getRiskLevelBadgeClassName(state.savedRiskLevel, dirty)}
      data-risk-level-state={dirty ? "pending" : state.savedClassificationState}
    >
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] opacity-75">
        {getRiskRegisterStaticCopy(language).labels.savedLevel}
      </div>
      <div className="text-sm font-semibold">{label}</div>
      {dirty ? (
        <div className="text-[0.7rem] leading-5 opacity-75">
          {getRiskRegisterStaticCopy(language).riskLevel.saveToRefresh}
        </div>
      ) : null}
    </div>
  );
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

function SeverityChoiceGroup({
  group,
  language,
  selectedLikelihood,
  selectedConsequence,
  onSelect,
}: {
  readonly group: AssessmentRiskSeverityChoiceGroupProjection;
  readonly language: AppLanguage;
  readonly selectedLikelihood: number | null;
  readonly selectedConsequence: number | null;
  readonly onSelect: (likelihood: number, consequence: number) => void;
}) {
  const groupLabel = getRiskLevelLabel(language, group.riskLevel);
  const groupSelected = group.options.some(
    (option) =>
      option.likelihood === selectedLikelihood &&
      option.consequence === selectedConsequence,
  );

  return (
    <section
      className={getSeverityChoiceGroupClassName(group.riskLevel, groupSelected)}
      data-severity-group={group.riskLevel}
    >
      <div className="flex items-center justify-between gap-3">
        <h5 className="text-sm font-semibold text-slate-950">{groupLabel}</h5>
        <span className="text-xs leading-5 text-slate-600">
          {group.options.length}
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {group.options.map((option) => {
          const selected =
            option.likelihood === selectedLikelihood &&
            option.consequence === selectedConsequence;

          return (
          <button
            aria-pressed={selected}
            className={getSeverityChoiceOptionClassName(group.riskLevel, selected)}
            data-consequence={String(option.consequence)}
            data-likelihood={String(option.likelihood)}
            data-severity-level={group.riskLevel}
            data-severity-option="true"
            key={`${option.likelihood}-${option.consequence}`}
            onClick={() => onSelect(option.likelihood, option.consequence)}
            type="button"
          >
            {getRiskSeverityChoiceOptionLabel({
              language,
              likelihood: option.likelihood,
              consequence: option.consequence,
            })}
          </button>
          );
        })}
      </div>
    </section>
  );
}

function getRiskEntryCardClassName(state: RiskEntryClientState): string {
  return joinClasses(
    "rounded-[1.75rem] border bg-[#fffdf8] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors sm:p-5",
    state.saveState === "error"
      ? "border-[#bb6b4b] bg-[#fff4ed]"
      : isRiskEntryDirty(state)
        ? "border-[#9aa986] bg-[#faf7ef]"
        : state.savedClassificationState === "ready"
          ? "border-black/8"
          : "border-[#d8b46c] bg-[#fffaf0]",
  );
}

function getRiskMitigationActionCardClassName(
  state: RiskMitigationActionClientState,
): string {
  return joinClasses(
    "rounded-[1.4rem] border bg-white/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-colors",
    state.saveState === "error"
      ? "border-[#bb6b4b] bg-[#fff4ed]"
      : state.saveState === "deleting"
        ? "border-[#bfa98a] bg-[#f7f0e4]"
        : isRiskMitigationActionDirty(state)
          ? "border-[#8a7d6a] bg-[#fbf7ef]"
          : "border-black/8",
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
          : state.savedClassificationState === "ready"
            ? "border-black/10 bg-[#f7f2e8] text-slate-600"
            : "border-[#d8b46c] bg-[#fff6de] text-[#6a4a05]",
  );
}

function getRiskMitigationActionStatePillClassName(
  state: RiskMitigationActionClientState,
): string {
  return joinClasses(
    "inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]",
    state.saveState === "saving"
      ? "border-[#7a8f67] bg-[#edf4ea] text-[#335126]"
      : state.saveState === "deleting"
        ? "border-[#8a7d6a] bg-[#f3eee5] text-[#564938]"
        : state.saveState === "error"
          ? "border-[#bb6b4b] bg-[#fff1e8] text-[#7d3211]"
          : isRiskMitigationActionDirty(state)
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

function getRiskEntrySaveMessageClassName(state: RiskEntryClientState): string {
  return joinClasses(
    "text-sm leading-6",
    state.saveState === "error"
      ? "text-[#8a2f0d]"
      : state.savedClassificationState === "ready"
        ? "text-slate-600"
        : "text-[#6a4a05]",
  );
}

function getRiskMitigationActionMessageClassName(
  state: RiskMitigationActionClientState,
): string {
  return joinClasses(
    "text-sm leading-6",
    state.saveState === "error"
      ? "text-[#8a2f0d]"
      : "text-slate-600",
  );
}

function getStepBannerClassName(availability: "available" | "blocked"): string {
  return joinClasses(
    "mt-4 rounded-[1.5rem] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
    availability === "blocked"
      ? "border-[#d7b778] bg-[#fff2d4]"
      : "border-black/10 bg-[#f7f2e8]",
  );
}

function getStepBannerPillClassName(availability: "available" | "blocked"): string {
  return joinClasses(
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]",
    availability === "blocked"
      ? "border-[#d7b778] bg-white text-[#805312]"
      : "border-black/10 bg-white text-slate-700",
  );
}

function getPrimaryButtonClassName(disabled: boolean): string {
  return joinClasses(
    "w-full rounded-full px-4 py-3 text-sm font-semibold transition sm:w-auto",
    disabled
      ? "cursor-not-allowed border border-black/10 bg-[#ebe4d7] text-slate-500"
      : "border border-[#243026] bg-[#243026] text-white shadow-[0_12px_28px_rgba(25,31,24,0.16)] hover:bg-[#314035]",
  );
}

function getSecondaryButtonClassName(disabled: boolean): string {
  return joinClasses(
    "w-full rounded-full border px-4 py-3 text-sm font-semibold transition sm:w-auto",
    disabled
      ? "cursor-not-allowed border-black/10 bg-[#ebe4d7] text-slate-500"
      : "border-black/10 bg-white text-slate-800 hover:border-slate-400 hover:text-slate-950",
  );
}

function getSeverityChoiceGroupClassName(
  riskLevel: "low" | "medium" | "high",
  selected: boolean,
): string {
  return joinClasses(
    "rounded-[1.2rem] border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition",
    selected
      ? riskLevel === "high"
        ? "border-[#b96f47] bg-[#fff1e7]"
        : riskLevel === "medium"
          ? "border-[#b59b42] bg-[#fff7dc]"
          : "border-[#6f8460] bg-[#eef5e9]"
      : "border-black/10 bg-white/80",
  );
}

function getSeverityChoiceOptionClassName(
  riskLevel: "low" | "medium" | "high",
  selected: boolean,
): string {
  return joinClasses(
    "rounded-[1rem] border px-3 py-3 text-left text-sm font-semibold transition",
    selected
      ? riskLevel === "high"
        ? "border-[#b96f47] bg-[#f7d8c9] text-[#6a3212]"
        : riskLevel === "medium"
          ? "border-[#b59b42] bg-[#f7ebbf] text-[#5d4b08]"
          : "border-[#6f8460] bg-[#dcead4] text-[#213019]"
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

function joinClasses(
  ...classNames: ReadonlyArray<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}
