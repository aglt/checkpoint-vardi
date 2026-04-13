import type {
  AssessmentExportReadiness,
  AssessmentSummaryRequiredField,
} from "@vardi/schemas";
import type { VardiDatabase } from "@vardi/db";

import type { AssessmentWorkflowRuleEvaluation } from "./assessmentWorkflowRules";
import {
  loadAssessmentReadModel,
  type AssessmentReadModel,
} from "./loadAssessmentReadModel";
import {
  loadAssessmentRiskRegisterProjection,
  type AssessmentRiskRegisterProjection,
} from "./loadAssessmentRiskRegisterProjection";
import {
  loadAssessmentSummaryProjection,
  type AssessmentSummaryProjection,
} from "./loadAssessmentSummaryProjection";

export interface LoadAssessmentProgressionProjectionParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly readModel?: AssessmentReadModel;
  readonly riskRegisterProjection?: AssessmentRiskRegisterProjection;
  readonly summaryProjection?: AssessmentSummaryProjection;
}

export type AssessmentProgressionStepId =
  | "walkthrough"
  | "riskRegister"
  | "summary"
  | "export";

export type AssessmentProgressionCompletionState =
  | "notStarted"
  | "inProgress"
  | "complete";

export type AssessmentProgressionAvailability = "available" | "blocked";

export type AssessmentProgressionBlockerCode =
  | "walkthroughUnansweredCriteria"
  | "walkthroughMissingSeverity"
  | "riskRegisterMissingTransfers"
  | "riskRegisterUnclassifiedEntries"
  | "riskRegisterStaleEntries"
  | "riskRegisterInvalidEntries"
  | "riskRegisterMissingJustification"
  | "riskRegisterMissingMitigation"
  | "summaryMissingFields";

export interface AssessmentProgressionMetrics {
  readonly completedCount: number;
  readonly totalCount: number;
  readonly percentage: number;
}

export interface AssessmentProgressionBlocker {
  readonly code: AssessmentProgressionBlockerCode;
  readonly count: number;
  readonly fieldIds?: readonly AssessmentSummaryRequiredField[];
}

interface AssessmentProgressionStepStatusBase {
  readonly id: AssessmentProgressionStepId;
  readonly order: number;
  readonly completionState: AssessmentProgressionCompletionState;
  readonly availability: AssessmentProgressionAvailability;
  readonly blockedByStepId: AssessmentProgressionStepId | null;
  readonly metrics: AssessmentProgressionMetrics;
  readonly blockers: readonly AssessmentProgressionBlocker[];
}

export interface AssessmentWalkthroughProgressionStepStatus
  extends AssessmentProgressionStepStatusBase {
  readonly id: "walkthrough";
  readonly validCompletedCriterionCount: number;
  readonly needsAttentionCriterionCount: number;
  readonly unansweredCriterionCount: number;
  readonly missingSeverityCriterionCount: number;
  readonly totalCriterionCount: number;
  readonly completedSectionCount: number;
  readonly totalSectionCount: number;
}

export interface AssessmentRiskRegisterProgressionStepStatus
  extends AssessmentProgressionStepStatusBase {
  readonly id: "riskRegister";
  readonly eligibleFindingCount: number;
  readonly transferredRiskEntryCount: number;
  readonly requiredEntryCount: number;
  readonly missingTransferCount: number;
  readonly unclassifiedRiskEntryCount: number;
  readonly staleRiskEntryCount: number;
  readonly invalidRiskEntryCount: number;
  readonly missingJustificationCount: number;
  readonly missingMitigationCount: number;
}

export interface AssessmentSummaryProgressionStepStatus
  extends AssessmentProgressionStepStatusBase {
  readonly id: "summary";
  readonly savedFieldCount: number;
  readonly requiredFieldCount: number;
  readonly missingFieldIds: readonly AssessmentSummaryRequiredField[];
}

export interface AssessmentExportProgressionStepStatus
  extends AssessmentProgressionStepStatusBase {
  readonly id: "export";
  readonly exportReady: boolean;
}

export type AssessmentProgressionStepStatus =
  | AssessmentWalkthroughProgressionStepStatus
  | AssessmentRiskRegisterProgressionStepStatus
  | AssessmentSummaryProgressionStepStatus
  | AssessmentExportProgressionStepStatus;

export interface AssessmentProgressionProjection {
  readonly assessmentId: string;
  readonly currentStepId: AssessmentProgressionStepId;
  readonly completedStepCount: number;
  readonly totalStepCount: number;
  readonly progressPercentage: number;
  readonly walkthrough: AssessmentWalkthroughProgressionStepStatus;
  readonly riskRegister: AssessmentRiskRegisterProgressionStepStatus;
  readonly summary: AssessmentSummaryProgressionStepStatus;
  readonly export: AssessmentExportProgressionStepStatus;
  readonly steps: readonly AssessmentProgressionStepStatus[];
  readonly exportReadiness: AssessmentExportReadiness;
  readonly workflowRuleEvaluation: AssessmentWorkflowRuleEvaluation;
}

export function loadAssessmentProgressionProjection(
  params: LoadAssessmentProgressionProjectionParams,
): AssessmentProgressionProjection {
  const readModel = params.readModel ?? loadAssessmentReadModel(params);
  const riskRegisterProjection =
    params.riskRegisterProjection ??
    loadAssessmentRiskRegisterProjection({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
      readModel,
    });
  const summaryProjection =
    params.summaryProjection ??
    loadAssessmentSummaryProjection({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
      readModel,
      riskRegisterProjection,
    });

  const walkthrough = buildWalkthroughStep(readModel);
  const riskRegister = buildRiskRegisterStep({
    readiness: summaryProjection.readiness,
    riskRegisterProjection,
    workflowRuleEvaluation: summaryProjection.workflowRuleEvaluation,
    walkthrough,
  });
  const summary = buildSummaryStep(summaryProjection);
  const exportStep = buildExportStep({
    readiness: summaryProjection.readiness,
    workflowRuleEvaluation: summaryProjection.workflowRuleEvaluation,
    prerequisiteSteps: [walkthrough, riskRegister, summary],
  });

  const prerequisiteSteps = [walkthrough, riskRegister, summary, exportStep];
  const steps = prerequisiteSteps.map((step) =>
    step.id === "walkthrough"
      ? step
      : applyAvailability(step, prerequisiteSteps),
  );
  const completedStepCount = steps.filter(
    (step) => step.completionState === "complete",
  ).length;

  return {
    assessmentId: params.assessmentId,
    currentStepId:
      steps.find((step) => step.completionState !== "complete")?.id ?? "export",
    completedStepCount,
    totalStepCount: steps.length,
    progressPercentage: buildPercentage(completedStepCount, steps.length),
    walkthrough: steps[0] as AssessmentWalkthroughProgressionStepStatus,
    riskRegister: steps[1] as AssessmentRiskRegisterProgressionStepStatus,
    summary: steps[2] as AssessmentSummaryProgressionStepStatus,
    export: steps[3] as AssessmentExportProgressionStepStatus,
    steps,
    exportReadiness: summaryProjection.readiness,
    workflowRuleEvaluation: summaryProjection.workflowRuleEvaluation,
  };
}

function buildWalkthroughStep(
  readModel: AssessmentReadModel,
): AssessmentWalkthroughProgressionStepStatus {
  const totalCriterionCount = readModel.sections.reduce(
    (count, section) => count + section.criteria.length,
    0,
  );
  const unansweredCriterionCount = readModel.sections.reduce(
    (count, section) =>
      count +
      section.criteria.filter((criterion) => criterion.response.status === "unanswered")
        .length,
    0,
  );
  const missingSeverityCriterionCount = readModel.sections.reduce(
    (count, section) =>
      count +
      section.criteria.filter(
        (criterion) =>
          criterion.response.status === "notOk" &&
          criterion.response.attentionSeverity == null,
      ).length,
    0,
  );
  const needsAttentionCriterionCount = readModel.sections.reduce(
    (count, section) =>
      count +
      section.criteria.filter(
        (criterion) =>
          criterion.response.status === "notOk" &&
          criterion.response.attentionSeverity != null,
      ).length,
    0,
  );
  const validCompletedCriterionCount = Math.max(
    totalCriterionCount - unansweredCriterionCount - missingSeverityCriterionCount,
    0,
  );
  const completedSectionCount = readModel.sections.filter((section) =>
    section.criteria.every(
      (criterion) =>
        criterion.response.status !== "unanswered" &&
        !(
          criterion.response.status === "notOk" &&
          criterion.response.attentionSeverity == null
        ),
    ),
  ).length;

  return {
    id: "walkthrough",
    order: 1,
    completionState: buildCompletionState({
      totalCount: totalCriterionCount,
      completedCount: validCompletedCriterionCount,
    }),
    availability: "available",
    blockedByStepId: null,
    metrics: {
      completedCount: validCompletedCriterionCount,
      totalCount: totalCriterionCount,
      percentage: buildPercentage(validCompletedCriterionCount, totalCriterionCount),
    },
    blockers: [
      ...(unansweredCriterionCount > 0
        ? [
            {
              code: "walkthroughUnansweredCriteria" as const,
              count: unansweredCriterionCount,
            },
          ]
        : []),
      ...(missingSeverityCriterionCount > 0
        ? [
            {
              code: "walkthroughMissingSeverity" as const,
              count: missingSeverityCriterionCount,
            },
          ]
        : []),
    ],
    validCompletedCriterionCount,
    needsAttentionCriterionCount,
    unansweredCriterionCount,
    missingSeverityCriterionCount,
    totalCriterionCount,
    completedSectionCount,
    totalSectionCount: readModel.sections.length,
  };
}

function buildRiskRegisterStep(params: {
  readonly readiness: AssessmentExportReadiness;
  readonly riskRegisterProjection: AssessmentRiskRegisterProjection;
  readonly workflowRuleEvaluation: AssessmentWorkflowRuleEvaluation;
  readonly walkthrough: AssessmentWalkthroughProgressionStepStatus;
}): AssessmentRiskRegisterProgressionStepStatus {
  const eligibleFindingCount = params.readiness.transfer.eligibleFindingCount;
  const transferredRiskEntryCount = params.riskRegisterProjection.entries.length;
  const requiredEntryCount = Math.max(
    eligibleFindingCount,
    transferredRiskEntryCount,
  );
  const missingTransferCount = params.readiness.transfer.missingRiskEntryCount;
  const unclassifiedRiskEntryCount =
    params.readiness.classification.unclassifiedRiskEntryCount;
  const staleRiskEntryCount = params.readiness.classification.staleRiskEntryCount;
  const invalidRiskEntryCount = params.readiness.classification.invalidRiskEntryCount;
  const missingJustificationCount =
    params.workflowRuleEvaluation.missingJustificationCount;
  const missingMitigationCount =
    params.workflowRuleEvaluation.missingMitigationCount;
  const completedCount =
    requiredEntryCount === 0
      ? 0
      : params.riskRegisterProjection.entries.filter((entry) =>
          isRiskRegisterEntryComplete(
            entry,
            params.workflowRuleEvaluation,
          ),
        ).length;

  let completionState: AssessmentProgressionCompletionState;

  if (requiredEntryCount === 0) {
    completionState =
      params.walkthrough.completionState === "complete"
        ? "complete"
        : "notStarted";
  } else if (completedCount === requiredEntryCount) {
    completionState = "complete";
  } else if (transferredRiskEntryCount > 0 || completedCount > 0) {
    completionState = "inProgress";
  } else {
    completionState = "notStarted";
  }

  return {
    id: "riskRegister",
    order: 2,
    completionState,
    availability: "available",
    blockedByStepId: null,
    metrics: {
      completedCount,
      totalCount: requiredEntryCount,
      percentage:
        requiredEntryCount === 0 && params.walkthrough.completionState === "complete"
          ? 100
          : buildPercentage(completedCount, requiredEntryCount),
    },
    blockers: buildRiskRegisterBlockers({
      missingTransferCount,
      unclassifiedRiskEntryCount,
      staleRiskEntryCount,
      invalidRiskEntryCount,
      missingJustificationCount,
      missingMitigationCount,
    }),
    eligibleFindingCount,
    transferredRiskEntryCount,
    requiredEntryCount,
    missingTransferCount,
    unclassifiedRiskEntryCount,
    staleRiskEntryCount,
    invalidRiskEntryCount,
    missingJustificationCount,
    missingMitigationCount,
  };
}

function buildSummaryStep(
  summaryProjection: AssessmentSummaryProjection,
): AssessmentSummaryProgressionStepStatus {
  const missingFieldIds = summaryProjection.workflowRuleEvaluation.missingSummaryFieldIds;
  const requiredFieldCount =
    summaryProjection.workflowRuleEvaluation.requiredSummaryFields.length;
  const savedFieldCount = requiredFieldCount - missingFieldIds.length;
  const completionState =
    requiredFieldCount === 0
      ? "complete"
      : buildCompletionState({
          totalCount: requiredFieldCount,
          completedCount: savedFieldCount,
        });
  const percentage =
    requiredFieldCount === 0
      ? 100
      : buildPercentage(savedFieldCount, requiredFieldCount);

  return {
    id: "summary",
    order: 3,
    completionState,
    availability: "available",
    blockedByStepId: null,
    metrics: {
      completedCount: savedFieldCount,
      totalCount: requiredFieldCount,
      percentage,
    },
    blockers:
      missingFieldIds.length > 0
        ? [
            {
              code: "summaryMissingFields",
              count: missingFieldIds.length,
              fieldIds: missingFieldIds,
            },
          ]
        : [],
    savedFieldCount,
    requiredFieldCount,
    missingFieldIds,
  };
}

function buildExportStep(params: {
  readonly readiness: AssessmentExportReadiness;
  readonly workflowRuleEvaluation: AssessmentWorkflowRuleEvaluation;
  readonly prerequisiteSteps: readonly AssessmentProgressionStepStatus[];
}): AssessmentExportProgressionStepStatus {
  const hasAnyProgress = params.prerequisiteSteps.some(
    (step) => step.completionState !== "notStarted",
  );
  const exportReady =
    params.readiness.exportReady && !params.workflowRuleEvaluation.blocksExport;

  return {
    id: "export",
    order: 4,
    completionState: exportReady
      ? "complete"
      : hasAnyProgress
        ? "inProgress"
        : "notStarted",
    availability: "available",
    blockedByStepId: null,
    metrics: {
      completedCount: exportReady ? 1 : 0,
      totalCount: 1,
      percentage: exportReady ? 100 : 0,
    },
    blockers: buildExportBlockers(
      params.readiness,
      params.workflowRuleEvaluation,
    ),
    exportReady,
  };
}

function buildRiskRegisterBlockers(params: {
  readonly missingTransferCount: number;
  readonly unclassifiedRiskEntryCount: number;
  readonly staleRiskEntryCount: number;
  readonly invalidRiskEntryCount: number;
  readonly missingJustificationCount: number;
  readonly missingMitigationCount: number;
}): readonly AssessmentProgressionBlocker[] {
  const blockers: AssessmentProgressionBlocker[] = [];

  if (params.missingTransferCount > 0) {
    blockers.push({
      code: "riskRegisterMissingTransfers",
      count: params.missingTransferCount,
    });
  }

  if (params.unclassifiedRiskEntryCount > 0) {
    blockers.push({
      code: "riskRegisterUnclassifiedEntries",
      count: params.unclassifiedRiskEntryCount,
    });
  }

  if (params.staleRiskEntryCount > 0) {
    blockers.push({
      code: "riskRegisterStaleEntries",
      count: params.staleRiskEntryCount,
    });
  }

  if (params.invalidRiskEntryCount > 0) {
    blockers.push({
      code: "riskRegisterInvalidEntries",
      count: params.invalidRiskEntryCount,
    });
  }

  if (params.missingJustificationCount > 0) {
    blockers.push({
      code: "riskRegisterMissingJustification",
      count: params.missingJustificationCount,
    });
  }

  if (params.missingMitigationCount > 0) {
    blockers.push({
      code: "riskRegisterMissingMitigation",
      count: params.missingMitigationCount,
    });
  }

  return blockers;
}

function buildExportBlockers(
  readiness: AssessmentExportReadiness,
  workflowRuleEvaluation: AssessmentWorkflowRuleEvaluation,
): readonly AssessmentProgressionBlocker[] {
  return [
    ...(readiness.walkthrough.unansweredCriterionCount > 0
      ? [
          {
            code: "walkthroughUnansweredCriteria" as const,
            count: readiness.walkthrough.unansweredCriterionCount,
          },
        ]
      : []),
    ...(readiness.walkthrough.missingSeverityCount > 0
      ? [
          {
            code: "walkthroughMissingSeverity" as const,
            count: readiness.walkthrough.missingSeverityCount,
          },
        ]
      : []),
    ...buildRiskRegisterBlockers({
      missingTransferCount: readiness.transfer.missingRiskEntryCount,
      unclassifiedRiskEntryCount:
        readiness.classification.unclassifiedRiskEntryCount,
      staleRiskEntryCount: readiness.classification.staleRiskEntryCount,
      invalidRiskEntryCount: readiness.classification.invalidRiskEntryCount,
      missingJustificationCount:
        workflowRuleEvaluation.missingJustificationCount,
      missingMitigationCount: workflowRuleEvaluation.missingMitigationCount,
    }),
    ...(readiness.summary.missingFields.length > 0
      ? [
          {
            code: "summaryMissingFields" as const,
            count: readiness.summary.missingFields.length,
            fieldIds: readiness.summary.missingFields,
          },
        ]
      : []),
  ];
}

function isRiskRegisterEntryComplete(
  entry: AssessmentRiskRegisterProjection["entries"][number],
  workflowRuleEvaluation: AssessmentWorkflowRuleEvaluation,
): boolean {
  if (entry.classificationState !== "ready" || entry.savedRiskLevel == null) {
    return false;
  }

  const entryRuleEvaluation =
    workflowRuleEvaluation.entryResultsByRiskEntryId[entry.id];

  return (
    !entryRuleEvaluation?.missingJustification &&
    !entryRuleEvaluation?.missingMitigation
  );
}

function applyAvailability<
  Step extends Exclude<AssessmentProgressionStepStatus, AssessmentWalkthroughProgressionStepStatus>,
>(
  step: Step,
  steps: readonly AssessmentProgressionStepStatus[],
): Step {
  const firstIncompletePriorStep = steps
    .slice(0, step.order - 1)
    .find((candidate) => candidate.completionState !== "complete");

  if (!firstIncompletePriorStep) {
    return step;
  }

  return {
    ...step,
    availability: "blocked",
    blockedByStepId: firstIncompletePriorStep.id,
  };
}

function buildCompletionState(params: {
  readonly totalCount: number;
  readonly completedCount: number;
}): AssessmentProgressionCompletionState {
  if (params.completedCount === 0) {
    return "notStarted";
  }

  if (params.completedCount >= params.totalCount) {
    return "complete";
  }

  return "inProgress";
}

function buildPercentage(completedCount: number, totalCount: number): number {
  if (totalCount === 0) {
    return 0;
  }

  return Math.round((completedCount / totalCount) * 100);
}
