import type {
  AssessmentRiskRegisterEntryProjection,
  RiskEntryClassificationState,
} from "./loadAssessmentRiskRegisterProjection";

export interface AssessmentSummaryPrioritizedEntry {
  readonly id: string;
  readonly criterionNumber: string;
  readonly criterionTitle: string;
  readonly sectionTitle: string;
  readonly hazard: string;
  readonly savedRiskLevel: AssessmentRiskRegisterEntryProjection["savedRiskLevel"];
  readonly classificationState: RiskEntryClassificationState;
}

export function buildAssessmentSummaryPrioritizedEntries(
  entries: readonly AssessmentRiskRegisterEntryProjection[],
): readonly AssessmentSummaryPrioritizedEntry[] {
  return entries
    .map((entry, index) => ({
      index,
      entry: toAssessmentSummaryPrioritizedEntry(entry),
      sortOrder: getPrioritySortOrder(entry),
    }))
    .sort((left, right) =>
      left.sortOrder === right.sortOrder
        ? left.index - right.index
        : left.sortOrder - right.sortOrder,
    )
    .map(({ entry }) => entry);
}

export function upsertAssessmentSummaryPrioritizedEntry(
  entries: readonly AssessmentSummaryPrioritizedEntry[],
  entry: AssessmentSummaryPrioritizedEntry,
): readonly AssessmentSummaryPrioritizedEntry[] {
  const existingIndex = entries.findIndex((current) => current.id === entry.id);
  const nextEntries =
    existingIndex === -1
      ? [...entries, entry]
      : entries.map((current, index) => (index === existingIndex ? entry : current));

  return [...nextEntries].sort(
    (left, right) => getPrioritySortOrder(left) - getPrioritySortOrder(right),
  );
}

export function toAssessmentSummaryPrioritizedEntry(
  entry: Pick<
    AssessmentRiskRegisterEntryProjection,
    | "id"
    | "criterionNumber"
    | "criterionTitle"
    | "sectionTitle"
    | "hazard"
    | "savedRiskLevel"
    | "classificationState"
  >,
): AssessmentSummaryPrioritizedEntry {
  return {
    id: entry.id,
    criterionNumber: entry.criterionNumber,
    criterionTitle: entry.criterionTitle,
    sectionTitle: entry.sectionTitle,
    hazard: entry.hazard.length > 0 ? entry.hazard : entry.criterionTitle,
    savedRiskLevel: entry.savedRiskLevel,
    classificationState: entry.classificationState,
  };
}

function getPrioritySortOrder(
  entry: Pick<
    AssessmentSummaryPrioritizedEntry,
    "classificationState" | "savedRiskLevel"
  >,
): number {
  if (entry.classificationState !== "ready" || entry.savedRiskLevel == null) {
    return 3;
  }

  switch (entry.savedRiskLevel) {
    case "high":
      return 0;
    case "medium":
      return 1;
    case "low":
      return 2;
  }
}
