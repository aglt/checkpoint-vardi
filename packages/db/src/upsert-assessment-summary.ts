import { and, eq } from "drizzle-orm";

import type { VardiDatabase } from "./database.js";
import {
  assessmentSummary,
  riskAssessment,
  type AssessmentSummaryRow,
} from "./schema.js";

export interface UpsertAssessmentSummaryParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly companyName?: string | null;
  readonly location?: string | null;
  readonly assessmentDate?: Date | null;
  readonly participants?: string | null;
  readonly method?: string | null;
  readonly notes?: string | null;
}

export class AssessmentSummaryNotFoundError extends Error {
  constructor(assessmentId: string, ownerId: string) {
    super(`Assessment ${assessmentId} was not found for owner ${ownerId}.`);
    this.name = "AssessmentSummaryNotFoundError";
  }
}

// This is the package-owned write seam for summary insert-or-update behavior.
export function upsertAssessmentSummary(
  params: UpsertAssessmentSummaryParams,
): AssessmentSummaryRow {
  const assessmentRow = params.db
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

  if (!assessmentRow) {
    throw new AssessmentSummaryNotFoundError(
      params.assessmentId,
      params.ownerId,
    );
  }

  const existingSummary = params.db
    .select({
      assessmentId: assessmentSummary.assessmentId,
    })
    .from(assessmentSummary)
    .where(
      and(
        eq(assessmentSummary.assessmentId, params.assessmentId),
        eq(assessmentSummary.ownerId, params.ownerId),
      ),
    )
    .get();

  const normalizedSummary = {
    companyName: normalizeOptionalText(params.companyName),
    location: normalizeOptionalText(params.location),
    assessmentDate: params.assessmentDate ?? null,
    participants: normalizeOptionalText(params.participants),
    method: normalizeOptionalText(params.method),
    notes: normalizeOptionalText(params.notes),
  } satisfies Omit<AssessmentSummaryRow, "assessmentId" | "ownerId">;

  if (existingSummary) {
    params.db
      .update(assessmentSummary)
      .set(normalizedSummary)
      .where(
        and(
          eq(assessmentSummary.assessmentId, params.assessmentId),
          eq(assessmentSummary.ownerId, params.ownerId),
        ),
      )
      .run();
  } else {
    params.db
      .insert(assessmentSummary)
      .values({
        assessmentId: params.assessmentId,
        ownerId: params.ownerId,
        ...normalizedSummary,
      })
      .run();
  }

  const savedSummary = params.db
    .select()
    .from(assessmentSummary)
    .where(
      and(
        eq(assessmentSummary.assessmentId, params.assessmentId),
        eq(assessmentSummary.ownerId, params.ownerId),
      ),
    )
    .get();

  if (!savedSummary) {
    throw new AssessmentSummaryNotFoundError(
      params.assessmentId,
      params.ownerId,
    );
  }

  return savedSummary;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}
