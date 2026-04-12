import type { SaveAssessmentSummaryOutput } from "@vardi/schemas";

import type {
  AssessmentSummaryProjection,
  AssessmentSummarySavedValues,
} from "./loadAssessmentSummaryProjection";

export type SaveState = "idle" | "saving" | "error";

export interface AssessmentSummaryDraft {
  readonly companyName: string;
  readonly location: string;
  readonly assessmentDate: string;
  readonly participants: string;
  readonly method: string;
  readonly notes: string;
}

export interface AssessmentSummaryClientState {
  readonly saved: AssessmentSummaryDraft;
  readonly draft: AssessmentSummaryDraft;
  readonly saveState: SaveState;
  readonly errorMessage: string | null;
  readonly requestId: number;
}

export function buildInitialAssessmentSummaryState(
  summary: AssessmentSummaryProjection["summary"],
): AssessmentSummaryClientState {
  return {
    saved: toSavedSummaryDraft(summary.saved),
    draft: summary.form,
    saveState: "idle",
    errorMessage: null,
    requestId: 0,
  };
}

export function updateAssessmentSummaryDraftField<
  Field extends keyof AssessmentSummaryDraft,
>(
  state: AssessmentSummaryClientState,
  field: Field,
  value: AssessmentSummaryDraft[Field],
): AssessmentSummaryClientState {
  return {
    ...state,
    draft: {
      ...state.draft,
      [field]: value,
    },
    saveState: state.saveState === "error" ? "idle" : state.saveState,
    errorMessage: null,
  };
}

export function beginAssessmentSummarySave(
  state: AssessmentSummaryClientState,
): {
  readonly state: AssessmentSummaryClientState;
  readonly requestId: number;
} {
  const requestId = state.requestId + 1;

  return {
    requestId,
    state: {
      ...state,
      saveState: "saving",
      errorMessage: null,
      requestId,
    },
  };
}

export function reconcileAssessmentSummarySaveSuccess(
  state: AssessmentSummaryClientState,
  requestId: number,
  response: SaveAssessmentSummaryOutput,
  sentDraft: AssessmentSummaryDraft,
): AssessmentSummaryClientState {
  if (state.requestId !== requestId) {
    return state;
  }

  const savedDraft = toSavedSummaryDraft(response);
  const draftChangedSinceSend = !areAssessmentSummaryDraftsEqual(
    state.draft,
    sentDraft,
  );

  return {
    ...state,
    saved: savedDraft,
    draft: draftChangedSinceSend ? state.draft : savedDraft,
    saveState: "idle",
    errorMessage: null,
  };
}

export function reconcileAssessmentSummarySaveFailure(
  state: AssessmentSummaryClientState,
  requestId: number,
  errorMessage: string,
): AssessmentSummaryClientState {
  if (state.requestId !== requestId) {
    return state;
  }

  return {
    ...state,
    saveState: "error",
    errorMessage,
  };
}

export function isAssessmentSummaryDirty(
  state: AssessmentSummaryClientState,
): boolean {
  return !areAssessmentSummaryDraftsEqual(state.saved, state.draft);
}

function areAssessmentSummaryDraftsEqual(
  left: AssessmentSummaryDraft,
  right: AssessmentSummaryDraft,
): boolean {
  return (
    left.companyName === right.companyName &&
    left.location === right.location &&
    left.assessmentDate === right.assessmentDate &&
    left.participants === right.participants &&
    left.method === right.method &&
    left.notes === right.notes
  );
}

function toSavedSummaryDraft(
  summary:
    | AssessmentSummarySavedValues
    | Pick<
        SaveAssessmentSummaryOutput,
        | "companyName"
        | "location"
        | "assessmentDate"
        | "participants"
        | "method"
        | "notes"
      >,
): AssessmentSummaryDraft {
  return {
    companyName: summary.companyName ?? "",
    location: summary.location ?? "",
    assessmentDate: summary.assessmentDate ?? "",
    participants: summary.participants ?? "",
    method: summary.method ?? "",
    notes: summary.notes ?? "",
  };
}
