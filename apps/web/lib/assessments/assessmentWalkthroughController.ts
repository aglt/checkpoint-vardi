import type {
  AssessmentWalkthroughAttentionSeverity,
  SaveAssessmentCriterionResponseOutput,
  SaveAssessmentCriterionStatus,
} from "@vardi/schemas";

import type {
  AssessmentSectionReadModel,
  PresenceStatus,
} from "./loadAssessmentReadModel";

export type SaveState = "idle" | "saving" | "error";
export type WalkthroughItemState = "complete" | "needsAttention" | "notAnswered";
export type NextBlocker =
  | "missingAnswer"
  | "missingSeverity"
  | "saving"
  | "saveError";

export interface CriterionDraft {
  readonly status: AssessmentSectionReadModel["criteria"][number]["response"]["status"];
  readonly attentionSeverity: AssessmentWalkthroughAttentionSeverity | null;
  readonly notes: string;
}

export interface CriterionClientState {
  readonly saved: CriterionDraft;
  readonly draft: CriterionDraft;
  readonly saveState: SaveState;
  readonly errorMessage: string | null;
  readonly lastSavedAt: string | null;
  readonly requestId: number;
}

export type CriterionStateMap = Record<string, CriterionClientState>;

export interface AssessmentWalkthroughProgress {
  readonly totalCriteria: number;
  readonly validCompletedCriteria: number;
  readonly needsAttentionCriteria: number;
  readonly completedSections: number;
  readonly progressPercentage: number;
}

export interface AssessmentWalkthroughSectionSummary {
  readonly itemState: WalkthroughItemState;
  readonly unansweredCount: number;
  readonly attentionCount: number;
  readonly validCompletedCount: number;
}

export interface AssessmentRiskTransferProgress {
  readonly eligibleCriteria: number;
  readonly transferredCriteria: number;
  readonly remainingCriteria: number;
}

export type CriterionRiskEntryStatusMap = Record<string, PresenceStatus>;

export function buildInitialCriterionState(
  sections: readonly AssessmentSectionReadModel[],
): CriterionStateMap {
  return Object.fromEntries(
    sections.flatMap((section) =>
      section.criteria.map((criterion) => {
        const draft = {
          status: criterion.response.status,
          attentionSeverity: criterion.response.attentionSeverity,
          notes: criterion.response.notes ?? "",
        } satisfies CriterionDraft;

        return [
          criterion.id,
          {
            saved: draft,
            draft,
            saveState: "idle",
            errorMessage: null,
            lastSavedAt: null,
            requestId: 0,
          } satisfies CriterionClientState,
        ];
      }),
    ),
  ) as CriterionStateMap;
}

export function getAssessmentWalkthroughProgress(
  sections: readonly AssessmentSectionReadModel[],
  criterionStates: CriterionStateMap,
): AssessmentWalkthroughProgress {
  const sectionSummaries = sections.map((section) =>
    getSectionWalkthroughSummary(section.criteria, criterionStates),
  );
  const totalCriteria = sectionSummaries.reduce(
    (count, summary) =>
      count + summary.validCompletedCount + summary.unansweredCount,
    0,
  );
  const validCompletedCriteria = sectionSummaries.reduce(
    (count, summary) => count + summary.validCompletedCount,
    0,
  );
  const needsAttentionCriteria = sectionSummaries.reduce(
    (count, summary) => count + summary.attentionCount,
    0,
  );
  const completedSections = sectionSummaries.reduce(
    (count, summary) => count + (summary.unansweredCount === 0 ? 1 : 0),
    0,
  );

  return {
    totalCriteria,
    validCompletedCriteria,
    needsAttentionCriteria,
    completedSections,
    progressPercentage:
      totalCriteria === 0 ? 0 : Math.round((validCompletedCriteria / totalCriteria) * 100),
  };
}

export function buildInitialCriterionRiskEntryStatus(
  sections: readonly AssessmentSectionReadModel[],
): CriterionRiskEntryStatusMap {
  return Object.fromEntries(
    sections.flatMap((section) =>
      section.criteria.map((criterion) => [criterion.id, criterion.riskEntryStatus] as const),
    ),
  ) as CriterionRiskEntryStatusMap;
}

export function getAssessmentRiskTransferProgress(
  criterionStates: CriterionStateMap,
  riskEntryStatusByCriterionId: CriterionRiskEntryStatusMap,
): AssessmentRiskTransferProgress {
  const eligibleCriteria = Object.values(criterionStates).reduce(
    (count, state) =>
      count + (getSavedWalkthroughItemState(state) === "needsAttention" ? 1 : 0),
    0,
  );
  const transferredCriteria = Object.entries(criterionStates).reduce(
    (count, [criterionId, state]) =>
      count +
      (getSavedWalkthroughItemState(state) === "needsAttention" &&
      riskEntryStatusByCriterionId[criterionId] === "present"
        ? 1
        : 0),
    0,
  );

  return {
    eligibleCriteria,
    transferredCriteria,
    remainingCriteria: Math.max(eligibleCriteria - transferredCriteria, 0),
  };
}

export function updateCriterionDraftNotes(
  criterionStates: CriterionStateMap,
  criterionId: string,
  notes: string,
): CriterionStateMap {
  const criterionState = criterionStates[criterionId];

  if (!criterionState) {
    return criterionStates;
  }

  return {
    ...criterionStates,
    [criterionId]: {
      ...criterionState,
      draft: {
        ...criterionState.draft,
        notes,
      },
      saveState: criterionState.saveState === "error" ? "idle" : criterionState.saveState,
      errorMessage: null,
    },
  };
}

export function beginCriterionSave(
  criterionStates: CriterionStateMap,
  criterionId: string,
  nextDraft: CriterionDraft,
): {
  readonly criterionStates: CriterionStateMap;
  readonly requestId: number;
} {
  const criterionState = criterionStates[criterionId];

  if (!criterionState) {
    return {
      criterionStates,
      requestId: 0,
    };
  }

  const requestId = criterionState.requestId + 1;

  return {
    requestId,
    criterionStates: {
      ...criterionStates,
      [criterionId]: {
        ...criterionState,
        draft: nextDraft,
        saveState: "saving",
        errorMessage: null,
        requestId,
      },
    },
  };
}

export function reconcileCriterionSaveSuccess(
  criterionStates: CriterionStateMap,
  criterionId: string,
  requestId: number,
  response: SaveAssessmentCriterionResponseOutput,
  sentDraft: CriterionDraft,
): CriterionStateMap {
  const criterionState = criterionStates[criterionId];

  if (!criterionState || criterionState.requestId !== requestId) {
    return criterionStates;
  }

  const savedDraft: CriterionDraft = {
    status: response.status,
    attentionSeverity: response.attentionSeverity,
    notes: response.notes ?? "",
  };
  const draftChangedSinceSend =
    criterionState.draft.status !== sentDraft.status ||
    criterionState.draft.attentionSeverity !== sentDraft.attentionSeverity ||
    criterionState.draft.notes !== sentDraft.notes;

  return {
    ...criterionStates,
    [criterionId]: {
      ...criterionState,
      saved: savedDraft,
      draft: draftChangedSinceSend ? criterionState.draft : savedDraft,
      saveState: "idle",
      errorMessage: null,
      lastSavedAt: response.updatedAt,
    },
  };
}

export function reconcileCriterionSaveFailure(
  criterionStates: CriterionStateMap,
  criterionId: string,
  requestId: number,
  errorMessage: string,
): CriterionStateMap {
  const criterionState = criterionStates[criterionId];

  if (!criterionState || criterionState.requestId !== requestId) {
    return criterionStates;
  }

  return {
    ...criterionStates,
    [criterionId]: {
      ...criterionState,
      saveState: "error",
      errorMessage,
    },
  };
}

export function getSectionWalkthroughSummary(
  criteria: readonly AssessmentSectionReadModel["criteria"][number][],
  criterionStates: CriterionStateMap,
): AssessmentWalkthroughSectionSummary {
  const summary = criteria.reduce<AssessmentWalkthroughSectionSummary>(
    (current, criterion) => {
      const state = criterionStates[criterion.id];
      const itemState = state ? getSavedWalkthroughItemState(state) : "notAnswered";

      if (itemState === "notAnswered") {
        return {
          ...current,
          unansweredCount: current.unansweredCount + 1,
        };
      }

      if (itemState === "needsAttention") {
        return {
          ...current,
          attentionCount: current.attentionCount + 1,
          validCompletedCount: current.validCompletedCount + 1,
        };
      }

      return {
        ...current,
        validCompletedCount: current.validCompletedCount + 1,
      };
    },
    {
      itemState: "complete",
      unansweredCount: 0,
      attentionCount: 0,
      validCompletedCount: 0,
    },
  );

  return {
    ...summary,
    itemState:
      summary.unansweredCount > 0
        ? "notAnswered"
        : summary.attentionCount > 0
          ? "needsAttention"
          : "complete",
  };
}

export function getRecoveryCriterionId(
  criteria: readonly AssessmentSectionReadModel["criteria"][number][],
  criterionStates: CriterionStateMap,
): string | null {
  const notAnsweredCriterion = criteria.find((criterion) => {
    const state = criterionStates[criterion.id];
    return !state || getSavedWalkthroughItemState(state) === "notAnswered";
  });

  if (notAnsweredCriterion) {
    return notAnsweredCriterion.id;
  }

  const needsAttentionCriterion = criteria.find((criterion) => {
    const state = criterionStates[criterion.id];
    return state && getSavedWalkthroughItemState(state) === "needsAttention";
  });

  return needsAttentionCriterion?.id ?? criteria[0]?.id ?? null;
}

export function getSavedWalkthroughItemState(
  state: CriterionClientState,
): WalkthroughItemState {
  return getWalkthroughItemStateFromDraft(state.saved);
}

export function getDraftWalkthroughItemState(
  state: CriterionClientState,
): WalkthroughItemState {
  return getWalkthroughItemStateFromDraft(state.draft);
}

export function getNextBlocker(state: CriterionClientState): NextBlocker | null {
  if (state.saveState === "saving") {
    return "saving";
  }

  if (state.saveState === "error") {
    return "saveError";
  }

  if (state.draft.status === "unanswered") {
    return "missingAnswer";
  }

  if (
    state.draft.status === "notOk" &&
    state.draft.attentionSeverity == null
  ) {
    return "missingSeverity";
  }

  return null;
}

export function isDirty(state: CriterionClientState): boolean {
  return (
    state.saved.status !== state.draft.status ||
    state.saved.attentionSeverity !== state.draft.attentionSeverity ||
    state.saved.notes !== state.draft.notes
  );
}

export function markTransferredRiskEntriesPresent(
  criterionStates: CriterionStateMap,
  riskEntryStatusByCriterionId: CriterionRiskEntryStatusMap,
): CriterionRiskEntryStatusMap {
  return Object.fromEntries(
    Object.entries(criterionStates).map(([criterionId, state]) => [
      criterionId,
      getSavedWalkthroughItemState(state) === "needsAttention"
        ? "present"
        : riskEntryStatusByCriterionId[criterionId] ?? "absent",
    ]),
  ) as CriterionRiskEntryStatusMap;
}

export function canPersistCriterionDraft(
  draft: CriterionDraft,
): draft is CriterionDraft & { readonly status: SaveAssessmentCriterionStatus } {
  return (
    draft.status !== "unanswered" &&
    (draft.status !== "notOk" || draft.attentionSeverity != null)
  );
}

function getWalkthroughItemStateFromDraft(
  draft: CriterionDraft,
): WalkthroughItemState {
  if (draft.status === "unanswered") {
    return "notAnswered";
  }

  if (draft.status === "notOk") {
    return draft.attentionSeverity == null ? "notAnswered" : "needsAttention";
  }

  return "complete";
}
