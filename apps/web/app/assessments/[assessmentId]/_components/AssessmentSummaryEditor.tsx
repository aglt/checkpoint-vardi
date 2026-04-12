"use client";

import React, { startTransition, useEffect, useState } from "react";
import type { GenerateAssessmentExportBundleOutput } from "@vardi/schemas";

import {
  beginAssessmentSummarySave,
  buildInitialAssessmentSummaryState,
  isAssessmentSummaryDirty,
  reconcileAssessmentSummarySaveFailure,
  reconcileAssessmentSummarySaveSuccess,
  updateAssessmentSummaryDraftField,
  type AssessmentSummaryClientState,
  type AssessmentSummaryDraft,
} from "@/lib/assessments/assessmentSummaryController";
import {
  ASSESSMENT_RISK_ENTRY_SAVED_EVENT,
  isAssessmentRiskEntrySavedEvent,
} from "@/lib/assessments/assessmentRiskEntrySavedEvent";
import { upsertAssessmentSummaryPrioritizedEntry } from "@/lib/assessments/assessmentSummaryPriorityEntries";
import type { AppLanguage } from "@/lib/i18n/appLanguage";
import {
  getAssessmentProgressionBlockerMessages,
  getAssessmentProgressionGuidanceMessage,
  getAssessmentProgressionMetricLabel,
  getAssessmentProgressionStatusLabel,
  getAssessmentProgressionStepLabel,
  buildLocalizedDownloadMessage,
  getAssessmentSummaryStaticCopy,
  getExportMessage,
  getPriorityBadgeLabel,
  getReadinessBlockers,
  getReadinessCountLabel,
  getSummarySaveMessage,
} from "@/lib/i18n/mvpCopy";
import { generateAssessmentExportBundleAction } from "@/lib/assessments/generateAssessmentExportBundleAction";
import type { AssessmentSummaryProjection } from "@/lib/assessments/loadAssessmentSummaryProjection";
import { saveAssessmentSummaryAction } from "@/lib/assessments/saveAssessmentSummaryAction";
import { useAssessmentProgression } from "./AssessmentProgressionContext";

interface AssessmentSummaryEditorProps {
  readonly assessmentId: string;
  readonly language: AppLanguage;
  readonly summary: AssessmentSummaryProjection["summary"];
  readonly prioritizedEntries: AssessmentSummaryProjection["prioritizedEntries"];
}

export function AssessmentSummaryEditor({
  assessmentId,
  language,
  summary,
  prioritizedEntries,
}: AssessmentSummaryEditorProps) {
  const { progression, refreshProgression } = useAssessmentProgression();
  const copy = getAssessmentSummaryStaticCopy(language);
  const readiness = progression.exportReadiness;
  const summaryStep = progression.summary;
  const exportStep = progression.export;
  const [summaryState, setSummaryState] = useState<AssessmentSummaryClientState>(
    () => buildInitialAssessmentSummaryState(summary),
  );
  const [priorityEntriesState, setPriorityEntriesState] = useState(
    prioritizedEntries,
  );
  const [exportState, setExportState] = useState<{
    readonly status: "idle" | "exporting" | "error" | "success";
    readonly message: string | null;
  }>({
    status: "idle",
    message: null,
  });

  useEffect(() => {
    setSummaryState(buildInitialAssessmentSummaryState(summary));
  }, [summary]);

  useEffect(() => {
    setPriorityEntriesState(prioritizedEntries);
  }, [prioritizedEntries]);

  useEffect(() => {
    setExportState({
      status: "idle",
      message: null,
    });
  }, [assessmentId, readiness.exportReady, summary]);

  useEffect(() => {
    const handleRiskEntrySaved = (event: Event) => {
      if (!isAssessmentRiskEntrySavedEvent(event)) {
        return;
      }

      if (event.detail.assessmentId !== assessmentId) {
        return;
      }

      startTransition(() => {
        setPriorityEntriesState((current) =>
          upsertAssessmentSummaryPrioritizedEntry(current, event.detail.entry),
        );
      });
    };

    window.addEventListener(
      ASSESSMENT_RISK_ENTRY_SAVED_EVENT,
      handleRiskEntrySaved,
    );

    return () => {
      window.removeEventListener(
        ASSESSMENT_RISK_ENTRY_SAVED_EVENT,
        handleRiskEntrySaved,
      );
    };
  }, [assessmentId]);

  const readinessBlockers = getReadinessBlockers(language, readiness);
  const summaryBlockerMessages = getAssessmentProgressionBlockerMessages(
    language,
    summaryStep.blockers,
  );
  const exportBlockerMessages = getAssessmentProgressionBlockerMessages(
    language,
    exportStep.blockers,
  );
  const classificationPendingCount =
    readiness.classification.unclassifiedRiskEntryCount +
    readiness.classification.staleRiskEntryCount +
    readiness.classification.invalidRiskEntryCount;
  const summaryDirty = isAssessmentSummaryDirty(summaryState);
  const exportDisabled =
    exportState.status === "exporting" ||
    summaryState.saveState === "saving" ||
    !readiness.exportReady ||
    summaryDirty;

  return (
    <section
      className="rounded-[2rem] border border-black/10 bg-[linear-gradient(180deg,rgba(255,252,246,0.94)_0%,rgba(246,239,226,0.92)_100%)] p-4 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur sm:p-5 lg:p-6"
      data-step-availability={summaryStep.availability}
      data-step-completion={summaryStep.completionState}
      data-summary-readiness={readiness.exportReady ? "ready" : "blocked"}
      id="assessment-step-summary"
    >
      <div className="flex flex-col gap-3 border-b border-black/8 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
            {copy.eyebrow}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            {copy.heading}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-700">
            {copy.description}
          </p>
        </div>
        <div
          className={getExportReadinessBadgeClassName(
            readiness.exportReady,
          )}
        >
          {readiness.exportReady
            ? copy.readinessBadge.ready
            : copy.readinessBadge.blocked}
        </div>
      </div>

      <div className={getStepBannerClassName(summaryStep.availability)}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={getStepBannerPillClassName(summaryStep.availability)}>
            {getAssessmentProgressionStatusLabel({
              language,
              step: summaryStep,
              currentStepId: progression.currentStepId,
            })}
          </span>
          <p className="text-sm leading-6 text-slate-700">
            {getAssessmentProgressionGuidanceMessage({
              language,
              step: summaryStep,
              currentStepId: progression.currentStepId,
            })}
          </p>
        </div>
        {summaryBlockerMessages.length > 0 ? (
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {summaryBlockerMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_22rem]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup
              description={copy.descriptions.companyName}
              id={`summary-company-name-${assessmentId}`}
              label={copy.fieldLabels.companyName}
            >
              <input
                className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                data-summary-field="companyName"
                id={`summary-company-name-${assessmentId}`}
                maxLength={200}
                onChange={(event) =>
                  handleSummaryFieldChange("companyName", event.target.value)
                }
                placeholder={copy.placeholders.companyName}
                type="text"
                value={summaryState.draft.companyName}
              />
            </FieldGroup>

            <FieldGroup
              description={copy.descriptions.location}
              id={`summary-location-${assessmentId}`}
              label={copy.fieldLabels.location}
            >
              <input
                className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                data-summary-field="location"
                id={`summary-location-${assessmentId}`}
                maxLength={300}
                onChange={(event) =>
                  handleSummaryFieldChange("location", event.target.value)
                }
                placeholder={copy.placeholders.location}
                type="text"
                value={summaryState.draft.location}
              />
            </FieldGroup>

            <FieldGroup
              description={copy.descriptions.assessmentDate}
              id={`summary-assessment-date-${assessmentId}`}
              label={copy.fieldLabels.assessmentDate}
            >
              <input
                className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                data-summary-field="assessmentDate"
                id={`summary-assessment-date-${assessmentId}`}
                onChange={(event) =>
                  handleSummaryFieldChange("assessmentDate", event.target.value)
                }
                type="date"
                value={summaryState.draft.assessmentDate}
              />
            </FieldGroup>

            <FieldGroup
              description={copy.descriptions.participants}
              id={`summary-participants-${assessmentId}`}
              label={copy.fieldLabels.participants}
            >
              <input
                className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                data-summary-field="participants"
                id={`summary-participants-${assessmentId}`}
                maxLength={1000}
                onChange={(event) =>
                  handleSummaryFieldChange("participants", event.target.value)
                }
                placeholder={copy.placeholders.participants}
                type="text"
                value={summaryState.draft.participants}
              />
            </FieldGroup>
          </div>

          <FieldGroup
            description={copy.descriptions.method}
            id={`summary-method-${assessmentId}`}
            label={copy.fieldLabels.method}
          >
            <textarea
              className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
              data-summary-field="method"
              id={`summary-method-${assessmentId}`}
              maxLength={500}
              onChange={(event) =>
                handleSummaryFieldChange("method", event.target.value)
              }
              placeholder={copy.placeholders.method}
              value={summaryState.draft.method}
            />
          </FieldGroup>

          <FieldGroup
            description={copy.descriptions.notes}
            id={`summary-notes-${assessmentId}`}
            label={copy.fieldLabels.notes}
          >
            <textarea
              className="min-h-44 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
              data-summary-field="notes"
              id={`summary-notes-${assessmentId}`}
              maxLength={4000}
              onChange={(event) =>
                handleSummaryFieldChange("notes", event.target.value)
              }
              placeholder={copy.placeholders.notes}
              value={summaryState.draft.notes}
            />
          </FieldGroup>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.75rem] border border-black/10 bg-[#203229] px-4 py-4 text-white shadow-[0_24px_60px_rgba(18,26,20,0.24)]">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                  {copy.readiness.eyebrow}
                </p>
                <h3 className="text-lg font-semibold tracking-tight">
                  {copy.readiness.heading}
                </h3>
                <p className="text-sm leading-6 text-white/75">
                  {copy.readiness.description}
                </p>
              </div>

              <div className="space-y-2">
                <ReadinessRow
                  count={readiness.walkthrough.unansweredCriterionCount}
                  dataKey="walkthrough"
                  label={copy.readiness.labels.walkthrough}
                  language={language}
                  ready={readiness.walkthrough.ready}
                />
                <ReadinessRow
                  count={readiness.transfer.missingRiskEntryCount}
                  dataKey="transfer"
                  label={copy.readiness.labels.transfer}
                  language={language}
                  ready={readiness.transfer.ready}
                />
                <ReadinessRow
                  count={classificationPendingCount}
                  dataKey="classification"
                  label={copy.readiness.labels.classification}
                  language={language}
                  ready={readiness.classification.ready}
                />
                <ReadinessRow
                  count={readiness.summary.missingFields.length}
                  dataKey="summary"
                  label={copy.readiness.labels.summary}
                  language={language}
                  ready={readiness.summary.ready}
                />
              </div>

              {readinessBlockers.length === 0 ? (
                <div className="rounded-[1.4rem] border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                  {copy.readiness.allReady}
                </div>
              ) : (
                <div className="space-y-2 rounded-[1.4rem] border border-white/10 bg-white/8 px-4 py-3 text-sm leading-6 text-white/80">
                  {readinessBlockers.map((blocker) => (
                    <p key={blocker}>{blocker}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-black/10 bg-white/84 px-4 py-4 shadow-[0_20px_55px_rgba(28,29,24,0.08)]">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {copy.priority.eyebrow}
                </p>
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                  {copy.priority.heading}
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  {copy.priority.description}
                </p>
              </div>

              {priorityEntriesState.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-black/12 bg-[#fbf7ef] px-4 py-4 text-sm leading-6 text-slate-600">
                  {copy.priority.empty}
                </div>
              ) : (
                <div className="space-y-2">
                  {priorityEntriesState.map((entry) => (
                    <article
                      className="rounded-[1.3rem] border border-black/8 bg-[#fbf7ef] px-3 py-3"
                      data-priority-state={entry.classificationState}
                      data-risk-level={entry.savedRiskLevel ?? "pending"}
                      key={entry.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {entry.sectionTitle} ·{" "}
                            {copy.priority.criterionLabel}{" "}
                            {entry.criterionNumber}
                          </div>
                          <div className="text-sm font-semibold leading-6 text-slate-950">
                            {entry.hazard}
                          </div>
                          <div className="text-sm leading-6 text-slate-600">
                            {entry.criterionTitle}
                          </div>
                        </div>
                        <span
                          className={getPriorityBadgeClassName(
                            entry.savedRiskLevel,
                            entry.classificationState,
                          )}
                        >
                          {getPriorityBadgeLabel({
                            language,
                            classificationState: entry.classificationState,
                            savedRiskLevel: entry.savedRiskLevel,
                          })}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-black/8 pt-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p
            aria-live="polite"
            className={getSummarySaveMessageClassName(summaryState)}
          >
            {getSummarySaveMessage({
              language,
              saveState: summaryState.saveState,
              dirty: summaryDirty,
              exportReady: readiness.exportReady,
              errorMessage: summaryState.errorMessage,
            })}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className={getSummarySaveButtonClassName(
              summaryState.saveState === "saving" || !summaryDirty,
            )}
            data-summary-save-state={summaryState.saveState}
            disabled={summaryState.saveState === "saving" || !summaryDirty}
            onClick={handleSummarySave}
            type="button"
          >
            {summaryState.saveState === "saving"
              ? copy.saveButtonSaving
              : copy.saveButton}
          </button>
        </div>
      </div>

      <section
        className="mt-5 rounded-[1.75rem] border border-black/10 bg-[#f7f2e8] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] sm:px-5"
        data-step-availability={exportStep.availability}
        data-step-completion={exportStep.completionState}
        id="assessment-step-export"
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {getAssessmentProgressionStepLabel(language, exportStep.id)}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                {getAssessmentProgressionMetricLabel({
                  language,
                  step: exportStep,
                })}
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                {copy.readiness.description}
              </p>
            </div>
            <span className={getExportReadinessBadgeClassName(readiness.exportReady)}>
              {readiness.exportReady
                ? copy.readinessBadge.ready
                : copy.readinessBadge.blocked}
            </span>
          </div>
        </div>

        <div className={getStepBannerClassName(exportStep.availability)}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={getStepBannerPillClassName(exportStep.availability)}>
              {getAssessmentProgressionStatusLabel({
                language,
                step: exportStep,
                currentStepId: progression.currentStepId,
              })}
            </span>
            <p className="text-sm leading-6 text-slate-700">
              {getAssessmentProgressionGuidanceMessage({
                language,
                step: exportStep,
                currentStepId: progression.currentStepId,
              })}
            </p>
          </div>
          {exportBlockerMessages.length > 0 ? (
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {exportBlockerMessages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <p
            aria-live="polite"
            className={getExportMessageClassName(exportState.status)}
            data-export-state={exportState.status}
          >
            {getExportMessage({
              language,
              exportReady: readiness.exportReady,
              exportState,
              summaryDirty,
            })}
          </p>
          <button
            className={getExportButtonClassName(exportDisabled)}
            data-export-button-state={exportState.status}
            disabled={exportDisabled}
            onClick={handleExportDownload}
            type="button"
          >
            {exportState.status === "exporting"
              ? copy.exportButtonSaving
              : copy.exportButton}
          </button>
        </div>
      </section>
    </section>
  );

  function handleSummaryFieldChange<
    Field extends keyof AssessmentSummaryDraft,
  >(field: Field, value: AssessmentSummaryDraft[Field]) {
    setSummaryState((current) =>
      updateAssessmentSummaryDraftField(current, field, value),
    );
  }

  function handleSummarySave() {
    if (summaryState.saveState === "saving") {
      return;
    }

    const sentDraft = summaryState.draft;
    const startedSave = beginAssessmentSummarySave(summaryState);
    const nextRequestId = startedSave.requestId;

    if (nextRequestId === 0) {
      return;
    }

    setSummaryState(startedSave.state);

    startTransition(async () => {
      try {
        const response = await saveAssessmentSummaryAction({
          assessmentId,
          input: {
            companyName: sentDraft.companyName,
            location: sentDraft.location,
            assessmentDate: sentDraft.assessmentDate,
            participants: sentDraft.participants,
            method: sentDraft.method,
            notes: sentDraft.notes,
          },
        });

        startTransition(() => {
          setSummaryState((current) =>
            reconcileAssessmentSummarySaveSuccess(
              current,
              nextRequestId,
              response,
              sentDraft,
            ),
          );
        });
        await refreshProgression();
      } catch (error: unknown) {
        startTransition(() => {
          setSummaryState((current) =>
            reconcileAssessmentSummarySaveFailure(
              current,
              nextRequestId,
              copy.fallbacks.save,
            ),
          );
        });
      }
    });
  }

  function handleExportDownload() {
    if (exportDisabled) {
      return;
    }

    setExportState({
      status: "exporting",
      message: null,
    });

    startTransition(async () => {
      try {
        const response = await generateAssessmentExportBundleAction({
          input: {
            assessmentId,
          },
        });

        downloadAssessmentExportBundle(response);

        startTransition(() => {
          setExportState({
            status: "success",
            message: buildLocalizedDownloadMessage(language, response.fileName),
          });
        });
      } catch (error: unknown) {
        startTransition(() => {
          setExportState({
            status: "error",
            message: copy.fallbacks.export,
          });
        });
      }
    });
  }
}

function FieldGroup({
  children,
  description,
  id,
  label,
}: {
  readonly children: React.ReactNode;
  readonly description: string;
  readonly id: string;
  readonly label: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-900" htmlFor={id}>
        {label}
      </label>
      {children}
      <p className="text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function ReadinessRow({
  count,
  dataKey,
  label,
  language,
  ready,
}: {
  readonly count: number;
  readonly dataKey: "walkthrough" | "transfer" | "classification" | "summary";
  readonly label: string;
  readonly language: AppLanguage;
  readonly ready: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-[1.1rem] border border-white/10 bg-white/6 px-3 py-2 text-sm"
      data-readiness-count={String(count)}
      data-readiness-key={dataKey}
      data-readiness-state={ready ? "ready" : "blocked"}
    >
      <span className="font-medium text-white">{label}</span>
      <span className={ready ? "text-emerald-200" : "text-amber-100"}>
        {getReadinessCountLabel(language, { ready, count })}
      </span>
    </div>
  );
}

function getPriorityBadgeClassName(
  riskLevel: "low" | "medium" | "high" | null,
  state: AssessmentSummaryEditorProps["prioritizedEntries"][number]["classificationState"],
): string {
  if (state === "staleRiskLevel" || state === "invalidClassification") {
    return "inline-flex shrink-0 items-center rounded-full border border-[#d7b778] bg-[#fff2d4] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#805312]";
  }

  if (riskLevel === "high") {
    return "inline-flex shrink-0 items-center rounded-full border border-[#d7a08d] bg-[#fbe2da] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a2f0d]";
  }

  if (riskLevel === "medium") {
    return "inline-flex shrink-0 items-center rounded-full border border-[#d7c18c] bg-[#fbf0cf] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6610]";
  }

  if (riskLevel === "low") {
    return "inline-flex shrink-0 items-center rounded-full border border-[#a8c2a1] bg-[#e7f1e2] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#355428]";
  }

  return "inline-flex shrink-0 items-center rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600";
}

function getExportReadinessBadgeClassName(ready: boolean): string {
  return ready
    ? "inline-flex w-fit items-center rounded-full border border-[#a8c2a1] bg-[#e7f1e2] px-3 py-1.5 text-sm font-semibold text-[#355428]"
    : "inline-flex w-fit items-center rounded-full border border-[#d7b778] bg-[#fff2d4] px-3 py-1.5 text-sm font-semibold text-[#805312]";
}

function getSummarySaveMessageClassName(
  state: AssessmentSummaryClientState,
): string {
  return joinClasses(
    "text-sm leading-6",
    state.saveState === "error" ? "text-[#8a2f0d]" : "text-slate-600",
  );
}

function getSummarySaveButtonClassName(disabled: boolean): string {
  return joinClasses(
    "rounded-full px-4 py-2.5 text-sm font-semibold transition",
    disabled
      ? "cursor-not-allowed border border-black/8 bg-black/5 text-slate-400"
      : "border border-[#4d6741] bg-[#4d6741] text-white hover:bg-[#3e5534]",
  );
}

function getExportButtonClassName(disabled: boolean): string {
  return joinClasses(
    "rounded-full px-4 py-2.5 text-sm font-semibold transition",
    disabled
      ? "cursor-not-allowed border border-black/8 bg-black/5 text-slate-400"
      : "border border-[#132b4f] bg-[#132b4f] text-white hover:bg-[#0f2340]",
  );
}

function getStepBannerClassName(availability: "available" | "blocked"): string {
  return joinClasses(
    "mt-4 rounded-[1.5rem] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
    availability === "blocked"
      ? "border-[#d7b778] bg-[#fff2d4]"
      : "border-black/10 bg-white/82",
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

function getExportMessageClassName(
  status: "idle" | "exporting" | "error" | "success",
): string {
  return joinClasses(
    "text-sm leading-6",
    status === "error"
      ? "text-[#8a2f0d]"
      : status === "success"
        ? "text-[#355428]"
        : "text-slate-600",
  );
}

function joinClasses(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function downloadAssessmentExportBundle(
  response: GenerateAssessmentExportBundleOutput,
) {
  const binary = atob(response.payloadBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: response.contentType,
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = response.fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
