import type {
  RiskMitigationActionStatus,
  SavedAssessmentRiskMitigationActionOutput,
} from "@vardi/schemas";

import type {
  AssessmentRiskMitigationActionProjection,
  AssessmentRiskRegisterEntryProjection,
} from "./loadAssessmentRiskRegisterProjection";

export type RiskMitigationActionSaveState =
  | "idle"
  | "saving"
  | "deleting"
  | "error";

export interface RiskMitigationActionDraft {
  readonly description: string;
  readonly assigneeName: string;
  readonly dueDate: string;
  readonly status: RiskMitigationActionStatus;
}

export interface RiskMitigationActionClientState {
  readonly clientId: string;
  readonly persistedId: string | null;
  readonly saved: RiskMitigationActionDraft | null;
  readonly draft: RiskMitigationActionDraft;
  readonly saveState: RiskMitigationActionSaveState;
  readonly errorMessage: string | null;
  readonly requestId: number;
}

export type RiskMitigationActionStateMap = Record<
  string,
  readonly RiskMitigationActionClientState[]
>;

let nextLocalMitigationDraftId = 0;

export function buildInitialRiskMitigationActionState(
  entries: readonly AssessmentRiskRegisterEntryProjection[],
): RiskMitigationActionStateMap {
  return Object.fromEntries(
    entries.map((entry) => [
      entry.id,
      entry.mitigationActions.map((action) => {
        const draft = toRiskMitigationActionDraft(action);

        return {
          clientId: action.id,
          persistedId: action.id,
          saved: draft,
          draft,
          saveState: "idle",
          errorMessage: null,
          requestId: 0,
        } satisfies RiskMitigationActionClientState;
      }),
    ]),
  ) as RiskMitigationActionStateMap;
}

export function addRiskMitigationActionDraft(
  actionStates: RiskMitigationActionStateMap,
  riskEntryId: string,
): RiskMitigationActionStateMap {
  const existingStates = actionStates[riskEntryId] ?? [];
  const emptyDraft = buildEmptyRiskMitigationActionDraft();

  return {
    ...actionStates,
    [riskEntryId]: [
      ...existingStates,
      {
        clientId: `draft-${++nextLocalMitigationDraftId}`,
        persistedId: null,
        saved: null,
        draft: emptyDraft,
        saveState: "idle",
        errorMessage: null,
        requestId: 0,
      },
    ],
  };
}

export function removeUnsavedRiskMitigationActionDraft(
  actionStates: RiskMitigationActionStateMap,
  riskEntryId: string,
  clientId: string,
): RiskMitigationActionStateMap {
  return {
    ...actionStates,
    [riskEntryId]: (actionStates[riskEntryId] ?? []).filter(
      (state) => state.clientId !== clientId,
    ),
  };
}

export function updateRiskMitigationActionDraftField<
  Field extends keyof RiskMitigationActionDraft,
>(
  actionStates: RiskMitigationActionStateMap,
  riskEntryId: string,
  clientId: string,
  field: Field,
  value: RiskMitigationActionDraft[Field],
): RiskMitigationActionStateMap {
  return {
    ...actionStates,
    [riskEntryId]: (actionStates[riskEntryId] ?? []).map((state) =>
      state.clientId !== clientId
        ? state
        : {
            ...state,
            draft: {
              ...state.draft,
              [field]: value,
            },
            saveState: state.saveState === "error" ? "idle" : state.saveState,
            errorMessage: null,
          },
    ),
  };
}

export function beginRiskMitigationActionSave(
  actionStates: RiskMitigationActionStateMap,
  riskEntryId: string,
  clientId: string,
): {
  readonly actionStates: RiskMitigationActionStateMap;
  readonly requestId: number;
} {
  const targetState = findRiskMitigationActionState(
    actionStates,
    riskEntryId,
    clientId,
  );

  if (!targetState) {
    return {
      actionStates,
      requestId: 0,
    };
  }

  const requestId = targetState.requestId + 1;

  return {
    requestId,
    actionStates: updateRiskMitigationActionState(
      actionStates,
      riskEntryId,
      clientId,
      (state) => ({
        ...state,
        saveState: "saving",
        errorMessage: null,
        requestId,
      }),
    ),
  };
}

export function reconcileRiskMitigationActionSaveSuccess(
  actionStates: RiskMitigationActionStateMap,
  riskEntryId: string,
  clientId: string,
  requestId: number,
  response: SavedAssessmentRiskMitigationActionOutput,
  sentDraft: RiskMitigationActionDraft,
): RiskMitigationActionStateMap {
  const targetState = findRiskMitigationActionState(
    actionStates,
    riskEntryId,
    clientId,
  );

  if (!targetState || targetState.requestId !== requestId) {
    return actionStates;
  }

  const savedDraft = toRiskMitigationActionDraft(response);
  const draftChangedSinceSend = !areRiskMitigationActionDraftsEqual(
    targetState.draft,
    sentDraft,
  );

  return {
    ...actionStates,
    [riskEntryId]: (actionStates[riskEntryId] ?? []).map((state) =>
      state.clientId !== clientId
        ? state
        : {
            clientId: response.mitigationActionId,
            persistedId: response.mitigationActionId,
            saved: savedDraft,
            draft: draftChangedSinceSend ? state.draft : savedDraft,
            saveState: "idle",
            errorMessage: null,
            requestId,
          },
    ),
  };
}

export function reconcileRiskMitigationActionSaveFailure(
  actionStates: RiskMitigationActionStateMap,
  riskEntryId: string,
  clientId: string,
  requestId: number,
  errorMessage: string,
): RiskMitigationActionStateMap {
  const targetState = findRiskMitigationActionState(
    actionStates,
    riskEntryId,
    clientId,
  );

  if (!targetState || targetState.requestId !== requestId) {
    return actionStates;
  }

  return updateRiskMitigationActionState(
    actionStates,
    riskEntryId,
    clientId,
    (state) => ({
      ...state,
      saveState: "error",
      errorMessage,
    }),
  );
}

export function beginRiskMitigationActionDelete(
  actionStates: RiskMitigationActionStateMap,
  riskEntryId: string,
  clientId: string,
): {
  readonly actionStates: RiskMitigationActionStateMap;
  readonly requestId: number;
} {
  const targetState = findRiskMitigationActionState(
    actionStates,
    riskEntryId,
    clientId,
  );

  if (!targetState) {
    return {
      actionStates,
      requestId: 0,
    };
  }

  const requestId = targetState.requestId + 1;

  return {
    requestId,
    actionStates: updateRiskMitigationActionState(
      actionStates,
      riskEntryId,
      clientId,
      (state) => ({
        ...state,
        saveState: "deleting",
        errorMessage: null,
        requestId,
      }),
    ),
  };
}

export function reconcileRiskMitigationActionDeleteSuccess(
  actionStates: RiskMitigationActionStateMap,
  riskEntryId: string,
  clientId: string,
  requestId: number,
): RiskMitigationActionStateMap {
  const targetState = findRiskMitigationActionState(
    actionStates,
    riskEntryId,
    clientId,
  );

  if (!targetState || targetState.requestId !== requestId) {
    return actionStates;
  }

  return {
    ...actionStates,
    [riskEntryId]: (actionStates[riskEntryId] ?? []).filter(
      (state) => state.clientId !== clientId,
    ),
  };
}

export function reconcileRiskMitigationActionDeleteFailure(
  actionStates: RiskMitigationActionStateMap,
  riskEntryId: string,
  clientId: string,
  requestId: number,
  errorMessage: string,
): RiskMitigationActionStateMap {
  const targetState = findRiskMitigationActionState(
    actionStates,
    riskEntryId,
    clientId,
  );

  if (!targetState || targetState.requestId !== requestId) {
    return actionStates;
  }

  return updateRiskMitigationActionState(
    actionStates,
    riskEntryId,
    clientId,
    (state) => ({
      ...state,
      saveState: "error",
      errorMessage,
    }),
  );
}

export function isRiskMitigationActionDirty(
  state: RiskMitigationActionClientState,
): boolean {
  if (!state.saved) {
    return hasRiskMitigationActionContent(state.draft);
  }

  return !areRiskMitigationActionDraftsEqual(state.saved, state.draft);
}

export function canPersistRiskMitigationActionDraft(
  draft: RiskMitigationActionDraft,
): boolean {
  return draft.description.trim().length > 0;
}

function buildEmptyRiskMitigationActionDraft(): RiskMitigationActionDraft {
  return {
    description: "",
    assigneeName: "",
    dueDate: "",
    status: "open",
  };
}

function updateRiskMitigationActionState(
  actionStates: RiskMitigationActionStateMap,
  riskEntryId: string,
  clientId: string,
  updater: (
    state: RiskMitigationActionClientState,
  ) => RiskMitigationActionClientState,
): RiskMitigationActionStateMap {
  return {
    ...actionStates,
    [riskEntryId]: (actionStates[riskEntryId] ?? []).map((state) =>
      state.clientId === clientId ? updater(state) : state,
    ),
  };
}

function findRiskMitigationActionState(
  actionStates: RiskMitigationActionStateMap,
  riskEntryId: string,
  clientId: string,
): RiskMitigationActionClientState | undefined {
  return (actionStates[riskEntryId] ?? []).find((state) => state.clientId === clientId);
}

function areRiskMitigationActionDraftsEqual(
  left: RiskMitigationActionDraft,
  right: RiskMitigationActionDraft,
): boolean {
  return (
    left.description === right.description &&
    left.assigneeName === right.assigneeName &&
    left.dueDate === right.dueDate &&
    left.status === right.status
  );
}

function hasRiskMitigationActionContent(
  draft: RiskMitigationActionDraft,
): boolean {
  return (
    draft.description.trim().length > 0 ||
    draft.assigneeName.trim().length > 0 ||
    draft.dueDate.trim().length > 0
  );
}

function toRiskMitigationActionDraft(
  action:
    | AssessmentRiskMitigationActionProjection
    | SavedAssessmentRiskMitigationActionOutput,
): RiskMitigationActionDraft {
  return {
    description: action.description,
    assigneeName: action.assigneeName ?? "",
    dueDate: action.dueDate ?? "",
    status: action.status,
  };
}
