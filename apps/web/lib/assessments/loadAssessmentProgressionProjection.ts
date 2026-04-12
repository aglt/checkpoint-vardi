import type {
  AssessmentExportReadiness,
  AssessmentSummaryRequiredField,
} from "@vardi/schemas";
import type { VardiDatabase } from "@vardi/db";

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
  | "riskRegisterMissingTransfers"
  | "riskRegisterUnclassifiedEntries"
  | "riskRegisterStaleEntries"
  | "riskRegisterInvalidEntries"
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
  readonly answeredCriterionCount: number;
  readonly unansweredCriterionCount: number;
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
}

const REQUIRED_SUMMARY_FIELDS = [
  "companyName",
  "location",
  "assessmentDate",
  "participants",
  "method",
  "notes",
] as const satisfies readonly AssessmentSummaryRequiredField[];

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
      riskRegisterProjection,
    });

  const walkthrough = buildWalkthroughStep(readModel);
  const riskRegister = buildRiskRegisterStep(summaryProjection.readiness, walkthrough);
  const summary = buildSummaryStep(summaryProjection.readiness);
  const exportStep = buildExportStep(summaryProjection.readiness, [
    walkthrough,
    riskRegister,
    summary,
  ]);

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
  const answeredCriterionCount = Math.max(
    totalCriterionCount - unansweredCriterionCount,
    0,
  );
  const completedSectionCount = readModel.sections.filter((section) =>
    section.criteria.every((criterion) => criterion.response.status !== "unanswered"),
  ).length;

  return {
    id: "walkthrough",
    order: 1,
    completionState: buildCompletionState({
      totalCount: totalCriterionCount,
      completedCount: answeredCriterionCount,
    }),
    availability: "available",
    blockedByStepId: null,
    metrics: {
      completedCount: answeredCriterionCount,
      totalCount: totalCriterionCount,
      percentage: buildPercentage(answeredCriterionCount, totalCriterionCount),
    },
    blockers:
      unansweredCriterionCount > 0
        ? [
            {
              code: "walkthroughUnansweredCriteria",
              count: unansweredCriterionCount,
            },
          ]
        : [],
    answeredCriterionCount,
    unansweredCriterionCount,
    totalCriterionCount,
    completedSectionCount,
    totalSectionCount: readModel.sections.length,
  };
}

function buildRiskRegisterStep(
  readiness: AssessmentExportReadiness,
  walkthrough: AssessmentWalkthroughProgressionStepStatus,
): AssessmentRiskRegisterProgressionStepStatus {
  const eligibleFindingCount = readiness.transfer.eligibleFindingCount;
  const transferredRiskEntryCount = readiness.classification.transferredRiskEntryCount;
  const requiredEntryCount = Math.max(
    eligibleFindingCount,
    transferredRiskEntryCount,
  );
  const missingTransferCount = readiness.transfer.missingRiskEntryCount;
  const unclassifiedRiskEntryCount =
    readiness.classification.unclassifiedRiskEntryCount;
  const staleRiskEntryCount = readiness.classification.staleRiskEntryCount;
  const invalidRiskEntryCount = readiness.classification.invalidRiskEntryCount;
  const remainingWorkCount =
    missingTransferCount +
    unclassifiedRiskEntryCount +
    staleRiskEntryCount +
    invalidRiskEntryCount;
  const completedCount =
    requiredEntryCount === 0
      ? 0
      : Math.max(requiredEntryCount - remainingWorkCount, 0);

  let completionState: AssessmentProgressionCompletionState;

  if (requiredEntryCount === 0) {
    completionState =
      walkthrough.completionState === "complete" ? "complete" : "notStarted";
  } else if (remainingWorkCount === 0) {
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
        requiredEntryCount === 0 && walkthrough.completionState === "complete"
          ? 100
          : buildPercentage(completedCount, requiredEntryCount),
    },
    blockers: buildRiskRegisterBlockers({
      missingTransferCount,
      unclassifiedRiskEntryCount,
      staleRiskEntryCount,
      invalidRiskEntryCount,
    }),
    eligibleFindingCount,
    transferredRiskEntryCount,
    requiredEntryCount,
    missingTransferCount,
    unclassifiedRiskEntryCount,
    staleRiskEntryCount,
    invalidRiskEntryCount,
  };
}

function buildSummaryStep(
  readiness: AssessmentExportReadiness,
): AssessmentSummaryProgressionStepStatus {
  const missingFieldIds = readiness.summary.missingFields;
  const savedFieldCount = REQUIRED_SUMMARY_FIELDS.length - missingFieldIds.length;

  return {
    id: "summary",
    order: 3,
    completionState: buildCompletionState({
      totalCount: REQUIRED_SUMMARY_FIELDS.length,
      completedCount: savedFieldCount,
    }),
    availability: "available",
    blockedByStepId: null,
    metrics: {
      completedCount: savedFieldCount,
      totalCount: REQUIRED_SUMMARY_FIELDS.length,
      percentage: buildPercentage(
        savedFieldCount,
        REQUIRED_SUMMARY_FIELDS.length,
      ),
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
    requiredFieldCount: REQUIRED_SUMMARY_FIELDS.length,
    missingFieldIds,
  };
}

function buildExportStep(
  readiness: AssessmentExportReadiness,
  prerequisiteSteps: readonly AssessmentProgressionStepStatus[],
): AssessmentExportProgressionStepStatus {
  const hasAnyProgress = prerequisiteSteps.some(
    (step) => step.completionState !== "notStarted",
  );

  return {
    id: "export",
    order: 4,
    completionState: readiness.exportReady
      ? "complete"
      : hasAnyProgress
        ? "inProgress"
        : "notStarted",
    availability: "available",
    blockedByStepId: null,
    metrics: {
      completedCount: readiness.exportReady ? 1 : 0,
      totalCount: 1,
      percentage: readiness.exportReady ? 100 : 0,
    },
    blockers: buildExportBlockers(readiness),
    exportReady: readiness.exportReady,
  };
}

function buildRiskRegisterBlockers(params: {
  readonly missingTransferCount: number;
  readonly unclassifiedRiskEntryCount: number;
  readonly staleRiskEntryCount: number;
  readonly invalidRiskEntryCount: number;
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

  return blockers;
}

function buildExportBlockers(
  readiness: AssessmentExportReadiness,
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
    ...buildRiskRegisterBlockers({
      missingTransferCount: readiness.transfer.missingRiskEntryCount,
      unclassifiedRiskEntryCount:
        readiness.classification.unclassifiedRiskEntryCount,
      staleRiskEntryCount: readiness.classification.staleRiskEntryCount,
      invalidRiskEntryCount: readiness.classification.invalidRiskEntryCount,
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
