"use client";

import React, { startTransition, useEffect, useState } from "react";
import type {
  AssessmentExportReadiness,
  AssessmentSummaryRequiredField,
  GenerateAssessmentExportBundleOutput,
} from "@vardi/schemas";

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
import { generateAssessmentExportBundleAction } from "@/lib/assessments/generateAssessmentExportBundleAction";
import type { AssessmentSummaryProjection } from "@/lib/assessments/loadAssessmentSummaryProjection";
import { saveAssessmentSummaryAction } from "@/lib/assessments/saveAssessmentSummaryAction";

interface AssessmentSummaryEditorProps {
  readonly assessmentId: string;
  readonly summary: AssessmentSummaryProjection["summary"];
  readonly prioritizedEntries: AssessmentSummaryProjection["prioritizedEntries"];
  readonly readiness: AssessmentSummaryProjection["readiness"];
}

export function AssessmentSummaryEditor({
  assessmentId,
  summary,
  prioritizedEntries,
  readiness,
}: AssessmentSummaryEditorProps) {
  const [summaryState, setSummaryState] = useState<AssessmentSummaryClientState>(
    () => buildInitialAssessmentSummaryState(summary, readiness),
  );
  const [exportState, setExportState] = useState<{
    readonly status: "idle" | "exporting" | "error" | "success";
    readonly message: string | null;
  }>({
    status: "idle",
    message: null,
  });

  useEffect(() => {
    setSummaryState(buildInitialAssessmentSummaryState(summary, readiness));
  }, [readiness, summary]);

  useEffect(() => {
    setExportState({
      status: "idle",
      message: null,
    });
  }, [assessmentId, readiness, summary]);

  const readinessBlockers = getReadinessBlockers(summaryState.readiness);
  const classificationPendingCount =
    summaryState.readiness.classification.unclassifiedRiskEntryCount +
    summaryState.readiness.classification.staleRiskEntryCount +
    summaryState.readiness.classification.invalidRiskEntryCount;
  const summaryDirty = isAssessmentSummaryDirty(summaryState);
  const exportDisabled =
    exportState.status === "exporting" ||
    summaryState.saveState === "saving" ||
    !summaryState.readiness.exportReady ||
    summaryDirty;

  return (
    <section
      className="rounded-[2rem] border border-black/10 bg-[linear-gradient(180deg,rgba(255,252,246,0.94)_0%,rgba(246,239,226,0.92)_100%)] p-4 shadow-[0_24px_70px_rgba(28,29,24,0.1)] backdrop-blur sm:p-5 lg:p-6"
      data-summary-readiness={summaryState.readiness.exportReady ? "ready" : "blocked"}
    >
      <div className="flex flex-col gap-3 border-b border-black/8 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
            Step 6
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Summary and export readiness
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-700">
            Capture the final assessment context here, then use the readiness
            panel to confirm the walkthrough, transfer, classification, and
            summary prerequisites are fully persisted for `S1-08`.
          </p>
        </div>
        <div
          className={getExportReadinessBadgeClassName(
            summaryState.readiness.exportReady,
          )}
        >
          {summaryState.readiness.exportReady
            ? "Export-ready state reached"
            : "Export readiness blocked"}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_22rem]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup
              description="Prefilled from the current workplace until you save it."
              id={`summary-company-name-${assessmentId}`}
              label="Company name"
            >
              <input
                className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                data-summary-field="companyName"
                id={`summary-company-name-${assessmentId}`}
                maxLength={200}
                onChange={(event) =>
                  handleSummaryFieldChange("companyName", event.target.value)
                }
                placeholder="Company or workplace name"
                type="text"
                value={summaryState.draft.companyName}
              />
            </FieldGroup>

            <FieldGroup
              description="Defaults from the workplace address when available."
              id={`summary-location-${assessmentId}`}
              label="Location"
            >
              <input
                className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                data-summary-field="location"
                id={`summary-location-${assessmentId}`}
                maxLength={300}
                onChange={(event) =>
                  handleSummaryFieldChange("location", event.target.value)
                }
                placeholder="Workplace location"
                type="text"
                value={summaryState.draft.location}
              />
            </FieldGroup>

            <FieldGroup
              description="Started date is suggested until you persist the final summary."
              id={`summary-assessment-date-${assessmentId}`}
              label="Assessment date"
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
              description="List who took part in the assessment."
              id={`summary-participants-${assessmentId}`}
              label="Participants"
            >
              <input
                className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                data-summary-field="participants"
                id={`summary-participants-${assessmentId}`}
                maxLength={1000}
                onChange={(event) =>
                  handleSummaryFieldChange("participants", event.target.value)
                }
                placeholder="Assessors, staff, students, or visitors"
                type="text"
                value={summaryState.draft.participants}
              />
            </FieldGroup>
          </div>

          <FieldGroup
            description="Describe the method used to complete the assessment."
            id={`summary-method-${assessmentId}`}
            label="Method"
          >
            <textarea
              className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
              data-summary-field="method"
              id={`summary-method-${assessmentId}`}
              maxLength={500}
              onChange={(event) =>
                handleSummaryFieldChange("method", event.target.value)
              }
              placeholder="Walkthrough, observation method, or scope..."
              value={summaryState.draft.method}
            />
          </FieldGroup>

          <FieldGroup
            description="Write the prioritised step-6 synthesis for the final deliverable."
            id={`summary-notes-${assessmentId}`}
            label="Summary notes"
          >
            <textarea
              className="min-h-44 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
              data-summary-field="notes"
              id={`summary-notes-${assessmentId}`}
              maxLength={4000}
              onChange={(event) =>
                handleSummaryFieldChange("notes", event.target.value)
              }
              placeholder="Summarize the highest-priority risks, the overall picture, and the most important next actions..."
              value={summaryState.draft.notes}
            />
          </FieldGroup>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.75rem] border border-black/10 bg-[#203229] px-4 py-4 text-white shadow-[0_24px_60px_rgba(18,26,20,0.24)]">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                  Readiness
                </p>
                <h3 className="text-lg font-semibold tracking-tight">
                  Export gate
                </h3>
                <p className="text-sm leading-6 text-white/75">
                  Prefilled workplace details help you start fast, but they only
                  count toward export readiness after you save them on this step.
                </p>
              </div>

              <div className="space-y-2">
                <ReadinessRow
                  count={
                    summaryState.readiness.walkthrough.unansweredCriterionCount
                  }
                  label="Walkthrough"
                  ready={summaryState.readiness.walkthrough.ready}
                />
                <ReadinessRow
                  count={summaryState.readiness.transfer.missingRiskEntryCount}
                  label="Transfer"
                  ready={summaryState.readiness.transfer.ready}
                />
                <ReadinessRow
                  count={classificationPendingCount}
                  label="Classification"
                  ready={summaryState.readiness.classification.ready}
                />
                <ReadinessRow
                  count={summaryState.readiness.summary.missingFields.length}
                  label="Summary"
                  ready={summaryState.readiness.summary.ready}
                />
              </div>

              {readinessBlockers.length === 0 ? (
                <div className="rounded-[1.4rem] border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                  All persisted prerequisites are ready. `S1-08` can consume
                  this assessment without reworking the summary or readiness
                  shape.
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
                  Priority reference
                </p>
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                  Risk entries by severity
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Use the sorted risk register as a reference while writing the
                  final summary.
                </p>
              </div>

              {prioritizedEntries.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-black/12 bg-[#fbf7ef] px-4 py-4 text-sm leading-6 text-slate-600">
                  No transferred risk entries are available yet. Any persisted{" "}
                  <span className="font-semibold">Not ok</span> findings still
                  need transfer before export readiness can pass.
                </div>
              ) : (
                <div className="space-y-2">
                  {prioritizedEntries.map((entry) => (
                    <article
                      className="rounded-[1.3rem] border border-black/8 bg-[#fbf7ef] px-3 py-3"
                      data-priority-state={entry.classificationState}
                      data-risk-level={entry.savedRiskLevel ?? "pending"}
                      key={entry.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {entry.sectionTitle} · Criterion {entry.criterionNumber}
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
                          {getPriorityBadgeLabel(entry)}
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
            {getSummarySaveMessage(summaryState)}
          </p>
          <p
            aria-live="polite"
            className={getExportMessageClassName(exportState.status)}
            data-export-state={exportState.status}
          >
            {getExportMessage({
              exportReady: summaryState.readiness.exportReady,
              exportState,
              summaryDirty,
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
              ? "Saving summary..."
              : "Save summary"}
          </button>
          <button
            className={getExportButtonClassName(exportDisabled)}
            data-export-button-state={exportState.status}
            disabled={exportDisabled}
            onClick={handleExportDownload}
            type="button"
          >
            {exportState.status === "exporting"
              ? "Building export bundle..."
              : "Download Word + PDF bundle"}
          </button>
        </div>
      </div>
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
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "We could not save this summary.";

        startTransition(() => {
          setSummaryState((current) =>
            reconcileAssessmentSummarySaveFailure(
              current,
              nextRequestId,
              errorMessage,
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
            message: `Downloaded ${response.fileName}.`,
          });
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "We could not generate the export bundle.";

        startTransition(() => {
          setExportState({
            status: "error",
            message: errorMessage,
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
  label,
  ready,
}: {
  readonly count: number;
  readonly label: string;
  readonly ready: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-[1.1rem] border border-white/10 bg-white/6 px-3 py-2 text-sm"
      data-readiness-count={String(count)}
      data-readiness-label={label}
      data-readiness-state={ready ? "ready" : "blocked"}
    >
      <span className="font-medium text-white">{label}</span>
      <span className={ready ? "text-emerald-200" : "text-amber-100"}>
        {ready ? "Ready" : `${count} open`}
      </span>
    </div>
  );
}

function getReadinessBlockers(readiness: AssessmentExportReadiness): string[] {
  const blockers: string[] = [];

  if (!readiness.walkthrough.ready) {
    blockers.push(
      `${readiness.walkthrough.unansweredCriterionCount} ${pluralize(readiness.walkthrough.unansweredCriterionCount, "walkthrough item still needs an answer", "walkthrough items still need answers")}.`,
    );
  }

  if (!readiness.transfer.ready) {
    blockers.push(
      `${readiness.transfer.missingRiskEntryCount} ${pluralize(readiness.transfer.missingRiskEntryCount, "eligible finding still needs transfer", "eligible findings still need transfer")} into the risk register.`,
    );
  }

  if (readiness.classification.unclassifiedRiskEntryCount > 0) {
    blockers.push(
      `${readiness.classification.unclassifiedRiskEntryCount} ${pluralize(readiness.classification.unclassifiedRiskEntryCount, "transferred entry still needs a saved classification", "transferred entries still need saved classifications")}.`,
    );
  }

  if (readiness.classification.staleRiskEntryCount > 0) {
    blockers.push(
      `${readiness.classification.staleRiskEntryCount} ${pluralize(readiness.classification.staleRiskEntryCount, "risk entry has a stale saved level", "risk entries have stale saved levels")} and need re-saving.`,
    );
  }

  if (readiness.classification.invalidRiskEntryCount > 0) {
    blockers.push(
      `${readiness.classification.invalidRiskEntryCount} ${pluralize(readiness.classification.invalidRiskEntryCount, "risk entry could not verify its saved classification", "risk entries could not verify their saved classifications")}.`,
    );
  }

  if (!readiness.summary.ready) {
    blockers.push(
      `Summary is still missing saved values for ${formatSummaryFieldList(
        readiness.summary.missingFields,
      )}.`,
    );
  }

  return blockers;
}

function getPriorityBadgeLabel(
  entry: AssessmentSummaryEditorProps["prioritizedEntries"][number],
): string {
  if (entry.classificationState === "staleRiskLevel") {
    return "Stale";
  }

  if (entry.classificationState === "invalidClassification") {
    return "Repair";
  }

  if (entry.savedRiskLevel == null) {
    return "Needs scoring";
  }

  return capitalize(entry.savedRiskLevel);
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

function getSummarySaveMessage(state: AssessmentSummaryClientState): string {
  if (state.saveState === "saving") {
    return "Saving the persisted summary and recomputing export readiness...";
  }

  if (state.saveState === "error") {
    return state.errorMessage ?? "We could not save this summary.";
  }

  if (isAssessmentSummaryDirty(state)) {
    return "Changes pending save. Export readiness updates after the server confirms this summary.";
  }

  return state.readiness.exportReady
    ? "Summary saved. This assessment is ready for the later export story."
    : "Summary saved. Remaining blockers are listed in the readiness panel.";
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

function getExportMessage(params: {
  readonly exportReady: boolean;
  readonly exportState: {
    readonly status: "idle" | "exporting" | "error" | "success";
    readonly message: string | null;
  };
  readonly summaryDirty: boolean;
}): string {
  if (params.exportState.status === "exporting") {
    return "Generating Word and PDF files from the persisted assessment state...";
  }

  if (params.exportState.status === "error") {
    return params.exportState.message ?? "We could not generate the export bundle.";
  }

  if (params.exportState.status === "success") {
    return params.exportState.message ?? "Export bundle downloaded.";
  }

  if (!params.exportReady) {
    return "Finish the readiness blockers above before export unlocks.";
  }

  if (params.summaryDirty) {
    return "Save summary changes before exporting the persisted bundle.";
  }

  return "Export uses the persisted checklist, risk register, and summary values.";
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

function formatSummaryFieldList(
  fields: readonly AssessmentSummaryRequiredField[],
): string {
  const labels = fields.map((field) => {
    switch (field) {
      case "companyName":
        return "company name";
      case "location":
        return "location";
      case "assessmentDate":
        return "assessment date";
      case "participants":
        return "participants";
      case "method":
        return "method";
      case "notes":
        return "summary notes";
    }
  });

  if (labels.length === 1) {
    return labels[0]!;
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

function joinClasses(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  return count === 1 ? singular : plural;
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
