import type {
  SaveAssessmentCriterionResponseOutput,
  SaveAssessmentCriterionStatus,
  SaveAssessmentRiskEntryOutput,
} from "@vardi/schemas";

import type {
  AssessmentRiskEntryReadModel,
  AssessmentSectionReadModel,
  PresenceStatus,
} from "./loadAssessmentReadModel";

export type SaveState = "idle" | "saving" | "error";

export interface CriterionDraft {
  readonly status: AssessmentSectionReadModel["criteria"][number]["response"]["status"];
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

export interface RiskEntryDraft {
  readonly hazard: string;
  readonly healthEffects: string;
  readonly whoAtRisk: string;
  readonly likelihood: number | null;
  readonly consequence: number | null;
  readonly currentControls: string;
  readonly proposedAction: string;
  readonly costEstimate: string;
  readonly responsibleOwner: string;
  readonly dueDate: string;
  readonly completedAt: string;
}

export interface RiskEntryClientState {
  readonly saved: RiskEntryDraft;
  readonly draft: RiskEntryDraft;
  readonly savedRiskLevel: AssessmentRiskEntryReadModel["riskLevel"];
  readonly saveState: SaveState;
  readonly errorMessage: string | null;
  readonly requestId: number;
}

export type RiskEntryStateMap = Record<string, RiskEntryClientState>;

export interface AssessmentWalkthroughProgress {
  readonly totalCriteria: number;
  readonly answeredCriteria: number;
  readonly completedSections: number;
  readonly progressPercentage: number;
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

export function buildInitialRiskEntryState(
  sections: readonly AssessmentSectionReadModel[],
): RiskEntryStateMap {
  return Object.fromEntries(
    sections.flatMap((section) =>
      section.criteria.flatMap((criterion) => {
        if (!criterion.riskEntry) {
          return [];
        }

        const draft = toRiskEntryDraft(criterion.riskEntry);

        return [
          [
            criterion.riskEntry.id,
            {
              saved: draft,
              draft,
              savedRiskLevel: criterion.riskEntry.riskLevel,
              saveState: "idle",
              errorMessage: null,
              requestId: 0,
            } satisfies RiskEntryClientState,
          ] as const,
        ];
      }),
    ),
  ) as RiskEntryStateMap;
}

export function getAssessmentWalkthroughProgress(
  sections: readonly AssessmentSectionReadModel[],
  criterionStates: CriterionStateMap,
): AssessmentWalkthroughProgress {
  const totalCriteria = sections.reduce(
    (count, section) => count + section.criteria.length,
    0,
  );
  const answeredCriteria = Object.values(criterionStates).reduce(
    (count, state) => count + (state.draft.status === "unanswered" ? 0 : 1),
    0,
  );
  const completedSections = sections.reduce(
    (count, section) =>
      count +
      (getAnsweredCount(section.criteria, criterionStates) ===
      section.criteria.length
        ? 1
        : 0),
    0,
  );

  return {
    totalCriteria,
    answeredCriteria,
    completedSections,
    progressPercentage:
      totalCriteria === 0 ? 0 : Math.round((answeredCriteria / totalCriteria) * 100),
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
    (count, state) => count + (state.saved.status === "notOk" ? 1 : 0),
    0,
  );
  const transferredCriteria = Object.entries(criterionStates).reduce(
    (count, [criterionId, state]) =>
      count +
      (state.saved.status === "notOk" &&
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

export function updateRiskEntryDraftField<Field extends keyof RiskEntryDraft>(
  riskEntryStates: RiskEntryStateMap,
  riskEntryId: string,
  field: Field,
  value: RiskEntryDraft[Field],
): RiskEntryStateMap {
  const riskEntryState = riskEntryStates[riskEntryId];

  if (!riskEntryState) {
    return riskEntryStates;
  }

  return {
    ...riskEntryStates,
    [riskEntryId]: {
      ...riskEntryState,
      draft: {
        ...riskEntryState.draft,
        [field]: value,
      },
      saveState: riskEntryState.saveState === "error" ? "idle" : riskEntryState.saveState,
      errorMessage: null,
    },
  };
}

export function beginRiskEntrySave(
  riskEntryStates: RiskEntryStateMap,
  riskEntryId: string,
): {
  readonly riskEntryStates: RiskEntryStateMap;
  readonly requestId: number;
} {
  const riskEntryState = riskEntryStates[riskEntryId];

  if (!riskEntryState) {
    return {
      riskEntryStates,
      requestId: 0,
    };
  }

  const requestId = riskEntryState.requestId + 1;

  return {
    requestId,
    riskEntryStates: {
      ...riskEntryStates,
      [riskEntryId]: {
        ...riskEntryState,
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
    notes: response.notes ?? "",
  };
  const draftChangedSinceSend =
    criterionState.draft.status !== sentDraft.status ||
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

export function reconcileRiskEntrySaveSuccess(
  riskEntryStates: RiskEntryStateMap,
  riskEntryId: string,
  requestId: number,
  response: SaveAssessmentRiskEntryOutput,
  sentDraft: RiskEntryDraft,
): RiskEntryStateMap {
  const riskEntryState = riskEntryStates[riskEntryId];

  if (!riskEntryState || riskEntryState.requestId !== requestId) {
    return riskEntryStates;
  }

  const savedDraft = toRiskEntryDraft(response);
  const draftChangedSinceSend = !areRiskEntryDraftsEqual(
    riskEntryState.draft,
    sentDraft,
  );

  return {
    ...riskEntryStates,
    [riskEntryId]: {
      ...riskEntryState,
      saved: savedDraft,
      draft: draftChangedSinceSend ? riskEntryState.draft : savedDraft,
      savedRiskLevel: response.riskLevel,
      saveState: "idle",
      errorMessage: null,
    },
  };
}

export function reconcileRiskEntrySaveFailure(
  riskEntryStates: RiskEntryStateMap,
  riskEntryId: string,
  requestId: number,
  errorMessage: string,
): RiskEntryStateMap {
  const riskEntryState = riskEntryStates[riskEntryId];

  if (!riskEntryState || riskEntryState.requestId !== requestId) {
    return riskEntryStates;
  }

  return {
    ...riskEntryStates,
    [riskEntryId]: {
      ...riskEntryState,
      saveState: "error",
      errorMessage,
    },
  };
}

export function getAnsweredCount(
  criteria: AssessmentSectionReadModel["criteria"],
  criterionStates: CriterionStateMap,
): number {
  return criteria.reduce((count, criterion) => {
    const state = criterionStates[criterion.id];
    return count + (state && state.draft.status !== "unanswered" ? 1 : 0);
  }, 0);
}

export function isDirty(state: CriterionClientState): boolean {
  return (
    state.saved.status !== state.draft.status ||
    state.saved.notes !== state.draft.notes
  );
}

export function isRiskEntryDirty(state: RiskEntryClientState): boolean {
  return !areRiskEntryDraftsEqual(state.saved, state.draft);
}

export function markTransferredRiskEntriesPresent(
  criterionStates: CriterionStateMap,
  riskEntryStatusByCriterionId: CriterionRiskEntryStatusMap,
): CriterionRiskEntryStatusMap {
  return Object.fromEntries(
    Object.entries(criterionStates).map(([criterionId, state]) => [
      criterionId,
      state.saved.status === "notOk"
        ? "present"
        : riskEntryStatusByCriterionId[criterionId] ?? "absent",
    ]),
  ) as CriterionRiskEntryStatusMap;
}

export function canPersistCriterionDraft(
  draft: CriterionDraft,
): draft is CriterionDraft & { readonly status: SaveAssessmentCriterionStatus } {
  return draft.status !== "unanswered";
}

export function canPersistRiskEntryDraft(draft: RiskEntryDraft): boolean {
  return draft.hazard.trim().length > 0;
}

function areRiskEntryDraftsEqual(
  left: RiskEntryDraft,
  right: RiskEntryDraft,
): boolean {
  return (
    left.hazard === right.hazard &&
    left.healthEffects === right.healthEffects &&
    left.whoAtRisk === right.whoAtRisk &&
    left.likelihood === right.likelihood &&
    left.consequence === right.consequence &&
    left.currentControls === right.currentControls &&
    left.proposedAction === right.proposedAction &&
    left.costEstimate === right.costEstimate &&
    left.responsibleOwner === right.responsibleOwner &&
    left.dueDate === right.dueDate &&
    left.completedAt === right.completedAt
  );
}

function toRiskEntryDraft(
  riskEntry: AssessmentRiskEntryReadModel | SaveAssessmentRiskEntryOutput,
): RiskEntryDraft {
  return {
    hazard: riskEntry.hazard,
    healthEffects: riskEntry.healthEffects ?? "",
    whoAtRisk: riskEntry.whoAtRisk ?? "",
    likelihood: riskEntry.likelihood ?? null,
    consequence: riskEntry.consequence ?? null,
    currentControls: riskEntry.currentControls ?? "",
    proposedAction: riskEntry.proposedAction ?? "",
    costEstimate:
      riskEntry.costEstimate == null ? "" : String(riskEntry.costEstimate),
    responsibleOwner: riskEntry.responsibleOwner ?? "",
    dueDate: riskEntry.dueDate ?? "",
    completedAt: riskEntry.completedAt ?? "",
  };
}
