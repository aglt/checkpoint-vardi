import type {
  RiskLevel,
  SeedChecklistSummaryRequiredField,
  SeedChecklistWorkflowRules,
} from "@vardi/checklists";
import type { AssessmentSummaryRequiredField } from "@vardi/schemas";

import type { AssessmentReadModel } from "./loadAssessmentReadModel";
import type { AssessmentRiskRegisterProjection } from "./loadAssessmentRiskRegisterProjection";

export type AppWorkflowRiskLevel = "low" | "medium" | "high";

export interface AppAssessmentWorkflowRules {
  readonly requiresJustification: boolean;
  readonly requiresMitigationForRiskLevels: readonly AppWorkflowRiskLevel[];
  readonly summaryRequiredFields: readonly AssessmentSummaryRequiredField[];
}

export interface AssessmentWorkflowRuleEntryEvaluation {
  readonly riskEntryId: string;
  readonly requiresJustification: boolean;
  readonly missingJustification: boolean;
  readonly requiresMitigation: boolean;
  readonly missingMitigation: boolean;
}

export interface AssessmentWorkflowRuleEvaluation {
  readonly requiredSummaryFields: readonly AssessmentSummaryRequiredField[];
  readonly missingSummaryFieldIds: readonly AssessmentSummaryRequiredField[];
  readonly entryResultsByRiskEntryId: Readonly<
    Record<string, AssessmentWorkflowRuleEntryEvaluation>
  >;
  readonly missingJustificationCount: number;
  readonly missingMitigationCount: number;
  readonly blocksRiskRegister: boolean;
  readonly blocksExport: boolean;
}

export interface AssessmentWorkflowRuleSummaryValues {
  readonly companyName: string | null;
  readonly location: string | null;
  readonly assessmentDate: string | null;
  readonly participants: string | null;
  readonly method: string | null;
  readonly notes: string | null;
}

export function mapChecklistRulesToAppRules(
  rules: SeedChecklistWorkflowRules,
): AppAssessmentWorkflowRules {
  return {
    requiresJustification: rules.requiresJustification,
    requiresMitigationForRiskLevels: rules.requiresMitigationForRiskLevels.map(
      mapWorkflowRiskLevel,
    ),
    summaryRequiredFields: rules.summaryRequiredFields.map(mapSummaryRequiredField),
  };
}

export function evaluateAssessmentWorkflowRules(params: {
  readonly readModel: AssessmentReadModel;
  readonly riskRegisterProjection: AssessmentRiskRegisterProjection;
  readonly summary: AssessmentWorkflowRuleSummaryValues;
  readonly rules: AppAssessmentWorkflowRules;
}): AssessmentWorkflowRuleEvaluation {
  void params.readModel;

  const missingSummaryFieldIds = params.rules.summaryRequiredFields.filter((field) =>
    isSummaryFieldMissing(params.summary, field),
  );
  const entryResultsByRiskEntryId: Record<string, AssessmentWorkflowRuleEntryEvaluation> =
    {};
  let missingJustificationCount = 0;
  let missingMitigationCount = 0;

  for (const entry of params.riskRegisterProjection.entries) {
    const hasSavedClassification =
      entry.classificationState === "ready" && entry.savedRiskLevel !== null;
    const requiresJustification =
      params.rules.requiresJustification && hasSavedClassification;
    const requiresMitigation =
      hasSavedClassification &&
      entry.savedRiskLevel !== null &&
      params.rules.requiresMitigationForRiskLevels.includes(entry.savedRiskLevel);
    const missingJustification =
      requiresJustification &&
      (entry.classificationReasoning == null ||
        entry.classificationReasoning.trim().length === 0);
    const missingMitigation =
      requiresMitigation && entry.mitigationActions.length === 0;

    if (missingJustification) {
      missingJustificationCount += 1;
    }

    if (missingMitigation) {
      missingMitigationCount += 1;
    }

    entryResultsByRiskEntryId[entry.id] = {
      riskEntryId: entry.id,
      requiresJustification,
      missingJustification,
      requiresMitigation,
      missingMitigation,
    };
  }

  const hasWorkflowRuleFailures =
    missingJustificationCount > 0 || missingMitigationCount > 0;

  return {
    requiredSummaryFields: params.rules.summaryRequiredFields,
    missingSummaryFieldIds,
    entryResultsByRiskEntryId,
    missingJustificationCount,
    missingMitigationCount,
    blocksRiskRegister: hasWorkflowRuleFailures,
    blocksExport: hasWorkflowRuleFailures,
  };
}

function mapWorkflowRiskLevel(riskLevel: RiskLevel): AppWorkflowRiskLevel {
  switch (riskLevel) {
    case "low":
    case "medium":
    case "high":
      return riskLevel;
  }
}

function mapSummaryRequiredField(
  field: SeedChecklistSummaryRequiredField,
): AssessmentSummaryRequiredField {
  switch (field) {
    case "companyName":
    case "location":
    case "assessmentDate":
    case "participants":
    case "method":
    case "notes":
      return field;
  }
}

function isSummaryFieldMissing(
  summary: AssessmentWorkflowRuleSummaryValues,
  field: AssessmentSummaryRequiredField,
): boolean {
  if (field === "assessmentDate") {
    return summary.assessmentDate == null;
  }

  return summary[field] == null || summary[field].trim().length === 0;
}
