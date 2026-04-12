"use client";

import React, { startTransition, useEffect, useRef, useState } from "react";

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
import type { AssessmentRiskRegisterEntryProjection } from "@/lib/assessments/loadAssessmentRiskRegisterProjection";
import { saveAssessmentRiskEntryAction } from "@/lib/assessments/saveAssessmentRiskEntryAction";

interface RiskRegisterEditorProps {
  readonly assessmentId: string;
  readonly riskMatrixTitle: string;
  readonly riskMatrixLikelihoodLevels: number;
  readonly riskMatrixConsequenceLevels: number;
  readonly entries: readonly AssessmentRiskRegisterEntryProjection[];
}

export function RiskRegisterEditor({
  assessmentId,
  riskMatrixTitle,
  riskMatrixLikelihoodLevels,
  riskMatrixConsequenceLevels,
  entries,
}: RiskRegisterEditorProps) {
  const [riskEntryStates, setRiskEntryStates] = useState<RiskEntryStateMap>(() =>
    buildInitialRiskEntryState(entries),
  );
  const riskEntryStatesRef = useRef<RiskEntryStateMap>(riskEntryStates);

  riskEntryStatesRef.current = riskEntryStates;

  useEffect(() => {
    setRiskEntryStates(buildInitialRiskEntryState(entries));
  }, [entries]);

  return (
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
            Transferred rows stay editable inside this assessment flow. Each save
            recalculates the stored classification from the pinned{" "}
            {riskMatrixTitle} matrix, while the summary step and later export
            shaping stay as separate owners below.
          </p>
        </div>
        <div className="rounded-full border border-black/10 bg-[#f7f2e8] px-3 py-1.5 text-sm font-medium text-slate-700">
          {entries.length} transferred {pluralize(entries.length, "entry", "entries")}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 rounded-[1.75rem] border border-dashed border-black/12 bg-[#fbf7ef] px-5 py-6 text-sm leading-6 text-slate-600">
          Mark a walkthrough item as <span className="font-semibold">Not ok</span>{" "}
          and transfer it to the risk register to unlock editable rows here.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {entries.map((entry) => {
            const riskEntryState = riskEntryStates[entry.id];

            if (!riskEntryState) {
              return null;
            }

            return (
              <article
                className={getRiskEntryCardClassName(riskEntryState)}
                data-risk-entry-id={entry.id}
                data-classification-state={riskEntryState.savedClassificationState}
                data-risk-level={riskEntryState.savedRiskLevel ?? "incomplete"}
                key={entry.id}
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex w-fit items-center rounded-full border border-black/10 bg-[#f7f2e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                          Criterion {entry.criterionNumber}
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
                          Transferred from the walkthrough. Save this row to keep
                          the persisted draft fields aligned with the pinned matrix
                          classification.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 lg:items-end">
                      <RiskLevelBadge state={riskEntryState} />
                      <RiskEntrySaveStatePill state={riskEntryState} />
                    </div>
                  </div>

                  {riskEntryState.savedClassificationState !== "ready" ? (
                    <div className="rounded-[1.4rem] border border-[#d8b46c] bg-[#fff6de] px-4 py-3 text-sm leading-6 text-[#6a4a05]">
                      {riskEntryState.savedClassificationMessage ??
                        "Save this entry to repair the stored classification."}
                    </div>
                  ) : null}

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-slate-900"
                          htmlFor={`hazard-${entry.id}`}
                        >
                          Hazard
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
                          placeholder="Describe the hazard..."
                          value={riskEntryState.draft.hazard}
                        />
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            className="text-sm font-medium text-slate-900"
                            htmlFor={`health-effects-${entry.id}`}
                          >
                            Possible health effects
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
                            placeholder="Possible injury or health outcome..."
                            value={riskEntryState.draft.healthEffects}
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                            className="text-sm font-medium text-slate-900"
                            htmlFor={`who-at-risk-${entry.id}`}
                          >
                            Who is at risk
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
                            placeholder="People or roles affected..."
                            value={riskEntryState.draft.whoAtRisk}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            className="text-sm font-medium text-slate-900"
                            htmlFor={`current-controls-${entry.id}`}
                          >
                            Current controls
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
                            placeholder="What is already in place?"
                            value={riskEntryState.draft.currentControls}
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                            className="text-sm font-medium text-slate-900"
                            htmlFor={`proposed-action-${entry.id}`}
                          >
                            Next action
                          </label>
                          <textarea
                            className="min-h-28 w-full rounded-[1.35rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#6f8460]"
                            id={`proposed-action-${entry.id}`}
                            onChange={(event) =>
                              handleRiskEntryFieldChange(
                                entry.id,
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
                                handleRiskScoreSelect(entry.id, "likelihood", null)
                              }
                              onSelect={(value) =>
                                handleRiskScoreSelect(entry.id, "likelihood", value)
                              }
                              selectedValue={riskEntryState.draft.likelihood}
                            />
                            <ScoreSelector
                              label="Consequence"
                              maxValue={riskMatrixConsequenceLevels}
                              onClear={() =>
                                handleRiskScoreSelect(entry.id, "consequence", null)
                              }
                              onSelect={(value) =>
                                handleRiskScoreSelect(entry.id, "consequence", value)
                              }
                              selectedValue={riskEntryState.draft.consequence}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup
                          id={`cost-estimate-${entry.id}`}
                          label="Cost estimate"
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
                            placeholder="0"
                            type="number"
                            value={riskEntryState.draft.costEstimate}
                          />
                        </FieldGroup>
                        <FieldGroup
                          id={`responsible-owner-${entry.id}`}
                          label="Responsible owner"
                        >
                          <input
                            className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                            id={`responsible-owner-${entry.id}`}
                            onChange={(event) =>
                              handleRiskEntryFieldChange(
                                entry.id,
                                "responsibleOwner",
                                event.target.value,
                              )
                            }
                            placeholder="Who owns this next step?"
                            type="text"
                            value={riskEntryState.draft.responsibleOwner}
                          />
                        </FieldGroup>
                        <FieldGroup id={`due-date-${entry.id}`} label="Planned date">
                          <input
                            className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                            id={`due-date-${entry.id}`}
                            onChange={(event) =>
                              handleRiskEntryFieldChange(
                                entry.id,
                                "dueDate",
                                event.target.value,
                              )
                            }
                            type="date"
                            value={riskEntryState.draft.dueDate}
                          />
                        </FieldGroup>
                        <FieldGroup
                          id={`completed-at-${entry.id}`}
                          label="Completed on"
                        >
                          <input
                            className="w-full rounded-[1.1rem] border border-black/10 bg-[#fffdf8] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#6f8460]"
                            id={`completed-at-${entry.id}`}
                            onChange={(event) =>
                              handleRiskEntryFieldChange(
                                entry.id,
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
                      onClick={() => handleRiskEntrySave(entry.id)}
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

function RiskLevelBadge({ state }: { readonly state: RiskEntryClientState }) {
  const dirty = isRiskEntryDirty(state);
  const label =
    state.savedClassificationState !== "ready" && !dirty
      ? "Needs repair"
      : state.savedRiskLevel
        ? capitalize(state.savedRiskLevel)
        : "Incomplete";

  return (
    <div
      className={getRiskLevelBadgeClassName(state.savedRiskLevel, dirty)}
      data-risk-level-state={dirty ? "pending" : state.savedClassificationState}
    >
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] opacity-75">
        Saved level
      </div>
      <div className="text-sm font-semibold">{label}</div>
      {dirty ? (
        <div className="text-[0.7rem] leading-5 opacity-75">Save to refresh</div>
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
    return "Changes pending save. The stored classification updates after save.";
  }

  if (state.savedClassificationState !== "ready") {
    return (
      state.savedClassificationMessage ??
      "Save this row to repair the stored classification."
    );
  }

  return state.savedRiskLevel
    ? `Saved classification: ${capitalize(state.savedRiskLevel)}.`
    : "Saved draft. Add both scores to derive the classification.";
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

function getRiskEntrySaveButtonClassName(disabled: boolean): string {
  return joinClasses(
    "w-full rounded-full px-4 py-3 text-sm font-semibold transition sm:w-auto",
    disabled
      ? "cursor-not-allowed border border-black/10 bg-[#ebe4d7] text-slate-500"
      : "border border-[#243026] bg-[#243026] text-white shadow-[0_12px_28px_rgba(25,31,24,0.16)] hover:bg-[#314035]",
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

function joinClasses(
  ...classNames: ReadonlyArray<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  return count === 1 ? singular : plural;
}
