import type { AssessmentSummaryPrioritizedEntry } from "./assessmentSummaryPriorityEntries";

export const ASSESSMENT_RISK_ENTRY_SAVED_EVENT =
  "vardi:assessment-risk-entry-saved";

export interface AssessmentRiskEntrySavedEventDetail {
  readonly assessmentId: string;
  readonly entry: AssessmentSummaryPrioritizedEntry;
}

export function dispatchAssessmentRiskEntrySavedEvent(
  detail: AssessmentRiskEntrySavedEventDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AssessmentRiskEntrySavedEventDetail>(
      ASSESSMENT_RISK_ENTRY_SAVED_EVENT,
      {
        detail,
      },
    ),
  );
}

export function isAssessmentRiskEntrySavedEvent(
  event: Event,
): event is CustomEvent<AssessmentRiskEntrySavedEventDetail> {
  return event.type === ASSESSMENT_RISK_ENTRY_SAVED_EVENT;
}
