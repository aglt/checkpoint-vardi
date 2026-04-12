import { and, eq } from "drizzle-orm";

import type { VardiDatabase } from "./database.js";
import {
  AssessmentRiskMitigationActionNotFoundError,
  loadAssessmentRiskMitigationActionContext,
} from "./load-assessment-risk-mitigation-action-context.js";
import {
  riskMitigationAction,
  type RiskMitigationActionRow,
} from "./schema.js";

export interface UpdateAssessmentRiskMitigationActionParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly mitigationActionId: string;
  readonly description: string;
  readonly assigneeName?: string | null;
  readonly dueDate?: Date | null;
  readonly status: RiskMitigationActionRow["status"];
  readonly updatedAt?: Date;
}

// This is the package-owned write seam for persisted mitigation-action edits.
export function updateAssessmentRiskMitigationAction(
  params: UpdateAssessmentRiskMitigationActionParams,
): RiskMitigationActionRow {
  loadAssessmentRiskMitigationActionContext({
    db: params.db,
    ownerId: params.ownerId,
    assessmentId: params.assessmentId,
    mitigationActionId: params.mitigationActionId,
  });

  params.db
    .update(riskMitigationAction)
    .set({
      description: params.description.trim(),
      assigneeName: normalizeOptionalText(params.assigneeName),
      dueDate: params.dueDate ?? null,
      status: params.status,
      updatedAt: params.updatedAt ?? new Date(),
    })
    .where(
      and(
        eq(riskMitigationAction.id, params.mitigationActionId),
        eq(riskMitigationAction.ownerId, params.ownerId),
      ),
    )
    .run();

  const updatedAction = params.db
    .select()
    .from(riskMitigationAction)
    .where(
      and(
        eq(riskMitigationAction.id, params.mitigationActionId),
        eq(riskMitigationAction.ownerId, params.ownerId),
      ),
    )
    .get();

  if (!updatedAction) {
    throw new AssessmentRiskMitigationActionNotFoundError(
      params.assessmentId,
      params.mitigationActionId,
      params.ownerId,
    );
  }

  return updatedAction;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}
