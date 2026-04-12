import { and, eq } from "drizzle-orm";

import type { VardiDatabase } from "./database.js";
import { finding, riskEntry, type RiskEntryRow } from "./schema.js";

export interface UpdateAssessmentRiskEntryParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly riskEntryId: string;
  readonly hazard: string;
  readonly healthEffects?: string | null;
  readonly whoAtRisk?: string | null;
  readonly likelihood?: number | null;
  readonly consequence?: number | null;
  readonly derivedRiskLevel: RiskEntryRow["riskLevel"];
  readonly currentControls?: string | null;
  readonly proposedAction?: string | null;
  readonly costEstimate?: number | null;
  readonly responsibleOwner?: string | null;
  readonly dueDate?: Date | null;
  readonly completedAt?: Date | null;
}

export class AssessmentRiskEntryNotFoundError extends Error {
  constructor(assessmentId: string, riskEntryId: string, ownerId: string) {
    super(
      `Risk entry ${riskEntryId} for assessment ${assessmentId} was not found for owner ${ownerId}.`,
    );
    this.name = "AssessmentRiskEntryNotFoundError";
  }
}

// This is the package-owned write seam for transferred risk-entry updates.
export function updateAssessmentRiskEntry(
  params: UpdateAssessmentRiskEntryParams,
): RiskEntryRow {
  const existingRiskEntry = params.db
    .select({
      id: riskEntry.id,
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

  if (!existingRiskEntry) {
    throw new AssessmentRiskEntryNotFoundError(
      params.assessmentId,
      params.riskEntryId,
      params.ownerId,
    );
  }

  params.db
    .update(riskEntry)
    .set({
      hazard: params.hazard,
      healthEffects: normalizeOptionalText(params.healthEffects),
      whoAtRisk: normalizeOptionalText(params.whoAtRisk),
      likelihood: params.likelihood ?? null,
      consequence: params.consequence ?? null,
      riskLevel: params.derivedRiskLevel,
      currentControls: normalizeOptionalText(params.currentControls),
      proposedAction: normalizeOptionalText(params.proposedAction),
      costEstimate: params.costEstimate ?? null,
      responsibleOwner: normalizeOptionalText(params.responsibleOwner),
      dueDate: params.dueDate ?? null,
      completedAt: params.completedAt ?? null,
    })
    .where(
      and(
        eq(riskEntry.id, params.riskEntryId),
        eq(riskEntry.ownerId, params.ownerId),
      ),
    )
    .run();

  const updatedRiskEntry = params.db
    .select()
    .from(riskEntry)
    .where(
      and(
        eq(riskEntry.id, params.riskEntryId),
        eq(riskEntry.ownerId, params.ownerId),
      ),
    )
    .get();

  if (!updatedRiskEntry) {
    throw new AssessmentRiskEntryNotFoundError(
      params.assessmentId,
      params.riskEntryId,
      params.ownerId,
    );
  }

  return updatedRiskEntry;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}
