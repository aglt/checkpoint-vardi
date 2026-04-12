import { and, eq } from "drizzle-orm";

import type { VardiDatabase } from "./database.js";
import {
  loadAssessmentRiskMitigationActionContext,
  type AssessmentRiskMitigationActionContext,
} from "./load-assessment-risk-mitigation-action-context.js";
import { riskMitigationAction } from "./schema.js";

export interface DeleteAssessmentRiskMitigationActionParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly mitigationActionId: string;
}

// This is the package-owned write seam for mitigation-action deletion.
export function deleteAssessmentRiskMitigationAction(
  params: DeleteAssessmentRiskMitigationActionParams,
): AssessmentRiskMitigationActionContext {
  const context = loadAssessmentRiskMitigationActionContext({
    db: params.db,
    ownerId: params.ownerId,
    assessmentId: params.assessmentId,
    mitigationActionId: params.mitigationActionId,
  });

  params.db
    .delete(riskMitigationAction)
    .where(
      and(
        eq(riskMitigationAction.id, params.mitigationActionId),
        eq(riskMitigationAction.ownerId, params.ownerId),
      ),
    )
    .run();

  return context;
}
