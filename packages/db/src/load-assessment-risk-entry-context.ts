import { and, eq } from "drizzle-orm";

import { AssessmentAggregateNotFoundError } from "./load-assessment-aggregate.js";
import type { VardiDatabase } from "./database.js";
import {
  finding,
  riskAssessment,
  riskEntry,
  type FindingRow,
  type RiskAssessmentRow,
  type RiskEntryRow,
} from "./schema.js";
import { AssessmentRiskEntryNotFoundError } from "./update-assessment-risk-entry.js";

export interface LoadAssessmentRiskEntryContextParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly riskEntryId: string;
}

export interface AssessmentRiskEntryContext {
  readonly assessment: Pick<RiskAssessmentRow, "id" | "riskMatrixId">;
  readonly finding: Pick<FindingRow, "id" | "criterionId">;
  readonly riskEntry: RiskEntryRow;
}

// This is the package-owned read seam for a single transferred risk-entry edit target.
export function loadAssessmentRiskEntryContext(
  params: LoadAssessmentRiskEntryContextParams,
): AssessmentRiskEntryContext {
  const assessment = params.db
    .select({
      id: riskAssessment.id,
      riskMatrixId: riskAssessment.riskMatrixId,
    })
    .from(riskAssessment)
    .where(
      and(
        eq(riskAssessment.id, params.assessmentId),
        eq(riskAssessment.ownerId, params.ownerId),
      ),
    )
    .get();

  if (!assessment) {
    throw new AssessmentAggregateNotFoundError(
      params.assessmentId,
      params.ownerId,
    );
  }

  const context = params.db
    .select({
      riskEntry,
      finding: {
        id: finding.id,
        criterionId: finding.criterionId,
      },
    })
    .from(riskEntry)
    .innerJoin(finding, eq(riskEntry.findingId, finding.id))
    .where(
      and(
        eq(riskEntry.id, params.riskEntryId),
        eq(riskEntry.ownerId, params.ownerId),
        eq(finding.ownerId, params.ownerId),
        eq(finding.assessmentId, params.assessmentId),
      ),
    )
    .get();

  if (!context) {
    throw new AssessmentRiskEntryNotFoundError(
      params.assessmentId,
      params.riskEntryId,
      params.ownerId,
    );
  }

  return {
    assessment,
    finding: context.finding,
    riskEntry: context.riskEntry,
  };
}
