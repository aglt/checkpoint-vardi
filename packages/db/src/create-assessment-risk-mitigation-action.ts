import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { VardiDatabase } from "./database.js";
import { loadAssessmentRiskEntryContext } from "./load-assessment-risk-entry-context.js";
import {
  riskMitigationAction,
  type RiskMitigationActionRow,
} from "./schema.js";

export interface CreateAssessmentRiskMitigationActionParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly riskEntryId: string;
  readonly description: string;
  readonly assigneeName?: string | null;
  readonly dueDate?: Date | null;
  readonly status: RiskMitigationActionRow["status"];
  readonly createdAt?: Date;
}

// This is the package-owned write seam for creating mitigation actions on a transferred risk entry.
export function createAssessmentRiskMitigationAction(
  params: CreateAssessmentRiskMitigationActionParams,
): RiskMitigationActionRow {
  loadAssessmentRiskEntryContext({
    db: params.db,
    ownerId: params.ownerId,
    assessmentId: params.assessmentId,
    riskEntryId: params.riskEntryId,
  });

  const createdAt = params.createdAt ?? new Date();
  const mitigationActionId = randomUUID();

  params.db
    .insert(riskMitigationAction)
    .values({
      id: mitigationActionId,
      riskEntryId: params.riskEntryId,
      ownerId: params.ownerId,
      description: params.description.trim(),
      assigneeName: normalizeOptionalText(params.assigneeName),
      dueDate: params.dueDate ?? null,
      status: params.status,
      createdAt,
      updatedAt: createdAt,
    })
    .run();

  const createdAction = params.db
    .select()
    .from(riskMitigationAction)
    .where(
      and(
        eq(riskMitigationAction.id, mitigationActionId),
        eq(riskMitigationAction.ownerId, params.ownerId),
      ),
    )
    .get();

  if (!createdAction) {
    throw new Error(
      `Mitigation action ${mitigationActionId} could not be loaded after creation.`,
    );
  }

  return createdAction;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}
