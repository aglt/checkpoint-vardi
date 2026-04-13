import { and, eq } from "drizzle-orm";

import type { VardiDatabase } from "./database.js";
import { finding, type FindingRow } from "./schema.js";

export type UpdatableFindingStatus = Exclude<FindingRow["status"], "unanswered">;

export interface UpdateAssessmentFindingResponseParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly criterionId: string;
  readonly status: UpdatableFindingStatus;
  readonly attentionSeverity?: FindingRow["attentionSeverity"] | null;
  readonly notes?: string | null;
  readonly notesLanguage?: string | null;
  readonly updatedAt?: Date;
}

export class AssessmentFindingResponseNotFoundError extends Error {
  constructor(assessmentId: string, criterionId: string, ownerId: string) {
    super(
      `Finding for assessment ${assessmentId} and criterion ${criterionId} was not found for owner ${ownerId}.`,
    );
    this.name = "AssessmentFindingResponseNotFoundError";
  }
}

// This is the package-owned write seam for criterion-level walkthrough updates.
export function updateAssessmentFindingResponse(
  params: UpdateAssessmentFindingResponseParams,
): FindingRow {
  const updatedAt = params.updatedAt ?? new Date();
  const normalizedNotes = normalizeNotes(params.notes);

  const result = params.db
    .update(finding)
    .set({
      status: params.status,
      attentionSeverity:
        params.status === "notOk" ? params.attentionSeverity ?? null : null,
      notes: normalizedNotes,
      notesLanguage: normalizedNotes ? params.notesLanguage ?? null : null,
      updatedAt,
    })
    .where(
      and(
        eq(finding.ownerId, params.ownerId),
        eq(finding.assessmentId, params.assessmentId),
        eq(finding.criterionId, params.criterionId),
      ),
    )
    .run();

  if (result.changes === 0) {
    throw new AssessmentFindingResponseNotFoundError(
      params.assessmentId,
      params.criterionId,
      params.ownerId,
    );
  }

  const updatedFinding = params.db
    .select()
    .from(finding)
    .where(
      and(
        eq(finding.ownerId, params.ownerId),
        eq(finding.assessmentId, params.assessmentId),
        eq(finding.criterionId, params.criterionId),
      ),
    )
    .get();

  if (!updatedFinding) {
    throw new AssessmentFindingResponseNotFoundError(
      params.assessmentId,
      params.criterionId,
      params.ownerId,
    );
  }

  return updatedFinding;
}

function normalizeNotes(notes: string | null | undefined): string | null {
  if (typeof notes !== "string") {
    return null;
  }

  const trimmedNotes = notes.trim();
  return trimmedNotes.length > 0 ? trimmedNotes : null;
}
