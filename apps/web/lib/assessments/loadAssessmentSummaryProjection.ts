import type {
  AssessmentExportReadiness,
  AssessmentSummaryRequiredField,
} from "@vardi/schemas";
import {
  loadAssessmentAggregate,
  type AssessmentSummaryRow,
  type VardiDatabase,
} from "@vardi/db";

import {
  evaluateAssessmentWorkflowRules,
  mapChecklistRulesToAppRules,
  type AssessmentWorkflowRuleEvaluation,
} from "./assessmentWorkflowRules";
import {
  loadAssessmentRiskRegisterProjection,
  type AssessmentRiskRegisterProjection,
} from "./loadAssessmentRiskRegisterProjection";
import {
  buildAssessmentSummaryPrioritizedEntries,
  type AssessmentSummaryPrioritizedEntry,
} from "./assessmentSummaryPriorityEntries";
import {
  loadAssessmentReadModel,
  type AssessmentReadModel,
} from "./loadAssessmentReadModel";

export interface LoadAssessmentSummaryProjectionParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly readModel?: AssessmentReadModel;
  readonly riskRegisterProjection?: AssessmentRiskRegisterProjection;
}

export interface AssessmentSummarySavedValues {
  readonly companyName: string | null;
  readonly location: string | null;
  readonly assessmentDate: string | null;
  readonly participants: string | null;
  readonly method: string | null;
  readonly notes: string | null;
}

export interface AssessmentSummaryFormValues {
  readonly companyName: string;
  readonly location: string;
  readonly assessmentDate: string;
  readonly participants: string;
  readonly method: string;
  readonly notes: string;
}

export type { AssessmentSummaryPrioritizedEntry } from "./assessmentSummaryPriorityEntries";

export interface AssessmentSummaryProjection {
  readonly assessmentId: string;
  readonly summary: {
    readonly saved: AssessmentSummarySavedValues;
    readonly defaults: AssessmentSummaryFormValues;
    readonly form: AssessmentSummaryFormValues;
  };
  readonly prioritizedEntries: readonly AssessmentSummaryPrioritizedEntry[];
  readonly readiness: AssessmentExportReadiness;
  readonly workflowRuleEvaluation: AssessmentWorkflowRuleEvaluation;
}

// This is the app-owned summary and export-readiness projection for S1-07.
export function loadAssessmentSummaryProjection(
  params: LoadAssessmentSummaryProjectionParams,
): AssessmentSummaryProjection {
  const aggregate = loadAssessmentAggregate({
    db: params.db,
    ownerId: params.ownerId,
    assessmentId: params.assessmentId,
  });
  const readModel =
    params.readModel ??
    loadAssessmentReadModel({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
    });
  const riskRegisterProjection =
    params.riskRegisterProjection ??
    loadAssessmentRiskRegisterProjection({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
      readModel,
    });
  const savedSummary = toSavedSummaryValues(aggregate.summary);
  const defaultSummary = buildDefaultSummaryValues({
    assessmentStartedAt: aggregate.assessment.startedAt,
    workplaceName: aggregate.workplace.name,
    workplaceAddress: aggregate.workplace.address,
  });
  const workflowRuleEvaluation = evaluateAssessmentWorkflowRules({
    readModel,
    riskRegisterProjection,
    summary: savedSummary,
    rules: mapChecklistRulesToAppRules(readModel.checklist.workflowRules),
  });

  return {
    assessmentId: aggregate.assessment.id,
    summary: {
      saved: savedSummary,
      defaults: defaultSummary,
      form: {
        companyName: savedSummary.companyName ?? defaultSummary.companyName,
        location: savedSummary.location ?? defaultSummary.location,
        assessmentDate: savedSummary.assessmentDate ?? defaultSummary.assessmentDate,
        participants: savedSummary.participants ?? defaultSummary.participants,
        method: savedSummary.method ?? defaultSummary.method,
        notes: savedSummary.notes ?? defaultSummary.notes,
      },
    },
    prioritizedEntries: buildAssessmentSummaryPrioritizedEntries(
      riskRegisterProjection.entries,
    ),
    readiness: buildAssessmentExportReadiness({
      findings: aggregate.findings,
      riskRegisterProjection,
      missingSummaryFields: workflowRuleEvaluation.missingSummaryFieldIds,
    }),
    workflowRuleEvaluation,
  };
}

function buildDefaultSummaryValues(params: {
  readonly assessmentStartedAt: Date;
  readonly workplaceName: string;
  readonly workplaceAddress: string | null;
}): AssessmentSummaryFormValues {
  return {
    companyName: params.workplaceName,
    location: params.workplaceAddress ?? "",
    assessmentDate: params.assessmentStartedAt.toISOString().slice(0, 10),
    participants: "",
    method: "",
    notes: "",
  };
}

function toSavedSummaryValues(
  summary: AssessmentSummaryRow | null,
): AssessmentSummarySavedValues {
  return {
    companyName: summary?.companyName ?? null,
    location: summary?.location ?? null,
    assessmentDate: formatDateOnly(summary?.assessmentDate ?? null),
    participants: summary?.participants ?? null,
    method: summary?.method ?? null,
    notes: summary?.notes ?? null,
  };
}

function buildAssessmentExportReadiness(params: {
  readonly findings: readonly {
    readonly id: string;
    readonly status: string;
  }[];
  readonly riskRegisterProjection: AssessmentRiskRegisterProjection;
  readonly missingSummaryFields: readonly AssessmentSummaryRequiredField[];
}): AssessmentExportReadiness {
  const unansweredCriterionCount = params.findings.filter(
    (finding) => finding.status === "unanswered",
  ).length;
  const eligibleFindingCount = params.findings.filter(
    (finding) => finding.status === "notOk",
  ).length;
  const transferredRiskEntryCount = params.riskRegisterProjection.entries.length;
  const missingRiskEntryCount = Math.max(
    eligibleFindingCount - transferredRiskEntryCount,
    0,
  );

  const classificationCounts = params.riskRegisterProjection.entries.reduce(
    (counts, entry) => {
      if (entry.classificationState === "staleRiskLevel") {
        return {
          ...counts,
          staleRiskEntryCount: counts.staleRiskEntryCount + 1,
        };
      }

      if (entry.classificationState === "invalidClassification") {
        return {
          ...counts,
          invalidRiskEntryCount: counts.invalidRiskEntryCount + 1,
        };
      }

      if (entry.savedRiskLevel == null) {
        return {
          ...counts,
          unclassifiedRiskEntryCount: counts.unclassifiedRiskEntryCount + 1,
        };
      }

      return counts;
    },
    {
      unclassifiedRiskEntryCount: 0,
      staleRiskEntryCount: 0,
      invalidRiskEntryCount: 0,
    },
  );

  const walkthroughReady = unansweredCriterionCount === 0;
  const transferReady = missingRiskEntryCount === 0;
  const classificationReady =
    classificationCounts.unclassifiedRiskEntryCount === 0 &&
    classificationCounts.staleRiskEntryCount === 0 &&
    classificationCounts.invalidRiskEntryCount === 0;
  const summaryReady = params.missingSummaryFields.length === 0;

  return {
    exportReady:
      walkthroughReady && transferReady && classificationReady && summaryReady,
    walkthrough: {
      ready: walkthroughReady,
      unansweredCriterionCount,
    },
    transfer: {
      ready: transferReady,
      eligibleFindingCount,
      missingRiskEntryCount,
    },
    classification: {
      ready: classificationReady,
      transferredRiskEntryCount,
      unclassifiedRiskEntryCount:
        classificationCounts.unclassifiedRiskEntryCount,
      staleRiskEntryCount: classificationCounts.staleRiskEntryCount,
      invalidRiskEntryCount: classificationCounts.invalidRiskEntryCount,
    },
    summary: {
      ready: summaryReady,
      missingFields: [...params.missingSummaryFields],
    },
  };
}

function formatDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
