import { and, asc, eq } from "drizzle-orm";

import type { VardiDatabase } from "./database.js";
import {
  finding,
  riskEntry,
  riskMitigationAction,
  type RiskMitigationActionRow,
} from "./schema.js";

export interface LoadAssessmentRiskMitigationActionsParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
}

// Narrow package-owned read seam for persisted mitigation actions on risk entries.
export function loadAssessmentRiskMitigationActions(
  params: LoadAssessmentRiskMitigationActionsParams,
): readonly RiskMitigationActionRow[] {
  return params.db
    .select({
      mitigationAction: riskMitigationAction,
    })
    .from(riskMitigationAction)
    .innerJoin(riskEntry, eq(riskMitigationAction.riskEntryId, riskEntry.id))
    .innerJoin(finding, eq(riskEntry.findingId, finding.id))
    .where(
      and(
        eq(riskMitigationAction.ownerId, params.ownerId),
        eq(riskEntry.ownerId, params.ownerId),
        eq(finding.ownerId, params.ownerId),
        eq(finding.assessmentId, params.assessmentId),
      ),
    )
    .orderBy(
      asc(riskMitigationAction.createdAt),
      asc(riskMitigationAction.id),
    )
    .all()
    .map((row) => row.mitigationAction);
}
