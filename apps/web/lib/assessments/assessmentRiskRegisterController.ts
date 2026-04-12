import type { SaveAssessmentRiskEntryOutput } from "@vardi/schemas";

import type {
  AssessmentRiskRegisterEntryProjection,
  RiskEntryClassificationState,
} from "./loadAssessmentRiskRegisterProjection";

export type SaveState = "idle" | "saving" | "error";

export interface RiskEntryDraft {
  readonly hazard: string;
  readonly healthEffects: string;
  readonly whoAtRisk: string;
  readonly likelihood: number | null;
  readonly consequence: number | null;
  readonly currentControls: string;
  readonly costEstimate: string;
}

export interface RiskEntryClientState {
  readonly saved: RiskEntryDraft;
  readonly draft: RiskEntryDraft;
  readonly savedRiskLevel: AssessmentRiskRegisterEntryProjection["savedRiskLevel"];
  readonly savedClassificationState: RiskEntryClassificationState;
  readonly savedClassificationMessage: string | null;
  readonly saveState: SaveState;
  readonly errorMessage: string | null;
  readonly requestId: number;
}

export type RiskEntryStateMap = Record<string, RiskEntryClientState>;

export function buildInitialRiskEntryState(
  entries: readonly AssessmentRiskRegisterEntryProjection[],
): RiskEntryStateMap {
  return Object.fromEntries(
    entries.map((entry) => {
      const draft = toRiskEntryDraft(entry);

      return [
        entry.id,
        {
          saved: draft,
          draft,
          savedRiskLevel: entry.savedRiskLevel,
          savedClassificationState: entry.classificationState,
          savedClassificationMessage: entry.classificationMessage,
          saveState: "idle",
          errorMessage: null,
          requestId: 0,
        } satisfies RiskEntryClientState,
      ] as const;
    }),
  ) as RiskEntryStateMap;
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
      savedClassificationState: "ready",
      savedClassificationMessage: null,
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

export function isRiskEntryDirty(state: RiskEntryClientState): boolean {
  return !areRiskEntryDraftsEqual(state.saved, state.draft);
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
    left.costEstimate === right.costEstimate
  );
}

function toRiskEntryDraft(
  riskEntry:
    | AssessmentRiskRegisterEntryProjection
    | SaveAssessmentRiskEntryOutput,
): RiskEntryDraft {
  return {
    hazard: riskEntry.hazard,
    healthEffects: riskEntry.healthEffects ?? "",
    whoAtRisk: riskEntry.whoAtRisk ?? "",
    likelihood: riskEntry.likelihood ?? null,
    consequence: riskEntry.consequence ?? null,
    currentControls: riskEntry.currentControls ?? "",
    costEstimate:
      riskEntry.costEstimate == null ? "" : String(riskEntry.costEstimate),
  };
}
