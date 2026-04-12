import { getRiskMatrixById, type RiskMatrix } from "@vardi/checklists";
import {
  loadAssessmentRiskEntryContext,
  type AssessmentRiskEntryContext,
  type VardiDatabase,
} from "@vardi/db";

export interface LoadAssessmentRiskEntrySaveContextParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly riskEntryId: string;
}

export interface AssessmentRiskEntrySaveContext {
  readonly context: AssessmentRiskEntryContext;
  readonly riskMatrix: RiskMatrix;
}

export class AssessmentRiskEntrySaveContextIntegrityError extends Error {
  constructor(assessmentId: string, riskMatrixId: string) {
    super(
      `Assessment ${assessmentId} references unknown risk matrix ${riskMatrixId}.`,
    );
    this.name = "AssessmentRiskEntrySaveContextIntegrityError";
  }
}

// This is the app-owned resolver for the pinned matrix needed by a single risk-entry save.
export function loadAssessmentRiskEntrySaveContext(
  params: LoadAssessmentRiskEntrySaveContextParams,
): AssessmentRiskEntrySaveContext {
  const context = loadAssessmentRiskEntryContext({
    db: params.db,
    ownerId: params.ownerId,
    assessmentId: params.assessmentId,
    riskEntryId: params.riskEntryId,
  });
  const riskMatrix = getRiskMatrixById(context.assessment.riskMatrixId);

  if (!riskMatrix) {
    throw new AssessmentRiskEntrySaveContextIntegrityError(
      params.assessmentId,
      context.assessment.riskMatrixId,
    );
  }

  return {
    context,
    riskMatrix,
  };
}
