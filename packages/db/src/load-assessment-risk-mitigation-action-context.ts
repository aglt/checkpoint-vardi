import { and, eq } from "drizzle-orm";

import type { VardiDatabase } from "./database.js";
import { AssessmentAggregateNotFoundError } from "./load-assessment-aggregate.js";
import {
  finding,
  riskAssessment,
  riskEntry,
  riskMitigationAction,
  type RiskAssessmentRow,
  type RiskEntryRow,
  type RiskMitigationActionRow,
} from "./schema.js";

export interface LoadAssessmentRiskMitigationActionContextParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly mitigationActionId: string;
}

export interface AssessmentRiskMitigationActionContext {
  readonly assessment: Pick<RiskAssessmentRow, "id">;
  readonly riskEntry: Pick<RiskEntryRow, "id" | "findingId">;
  readonly mitigationAction: RiskMitigationActionRow;
}

export class AssessmentRiskMitigationActionNotFoundError extends Error {
  constructor(assessmentId: string, mitigationActionId: string, ownerId: string) {
    super(
      `Mitigation action ${mitigationActionId} for assessment ${assessmentId} was not found for owner ${ownerId}.`,
    );
    this.name = "AssessmentRiskMitigationActionNotFoundError";
  }
}

// This is the package-owned read seam for a single mitigation-action edit/delete target.
export function loadAssessmentRiskMitigationActionContext(
  params: LoadAssessmentRiskMitigationActionContextParams,
): AssessmentRiskMitigationActionContext {
  const assessment = params.db
    .select({
      id: riskAssessment.id,
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
      riskEntry: {
        id: riskEntry.id,
        findingId: riskEntry.findingId,
      },
      mitigationAction: riskMitigationAction,
    })
    .from(riskMitigationAction)
    .innerJoin(riskEntry, eq(riskMitigationAction.riskEntryId, riskEntry.id))
    .innerJoin(finding, eq(riskEntry.findingId, finding.id))
    .where(
      and(
        eq(riskMitigationAction.id, params.mitigationActionId),
        eq(riskMitigationAction.ownerId, params.ownerId),
        eq(riskEntry.ownerId, params.ownerId),
        eq(finding.ownerId, params.ownerId),
        eq(finding.assessmentId, params.assessmentId),
      ),
    )
    .get();

  if (!context) {
    throw new AssessmentRiskMitigationActionNotFoundError(
      params.assessmentId,
      params.mitigationActionId,
      params.ownerId,
    );
  }

  return {
    assessment,
    riskEntry: context.riskEntry,
    mitigationAction: context.mitigationAction,
  };
}
