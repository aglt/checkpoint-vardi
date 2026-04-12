import { and, asc, eq, inArray } from "drizzle-orm";

import type { VardiDatabase } from "./database.js";
import {
  assessmentSummary,
  finding,
  riskAssessment,
  riskEntry,
  riskMitigationAction,
  type AssessmentSummaryRow,
  type FindingRow,
  type RiskAssessmentRow,
  type RiskEntryRow,
  type RiskMitigationActionRow,
  type WorkplaceRow,
  workplace,
} from "./schema.js";

export interface LoadAssessmentAggregateParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
}

export interface AssessmentAggregate {
  readonly workplace: WorkplaceRow;
  readonly assessment: RiskAssessmentRow;
  readonly findings: readonly FindingRow[];
  readonly riskEntries: readonly RiskEntryRow[];
  readonly mitigationActions: readonly RiskMitigationActionRow[];
  readonly summary: AssessmentSummaryRow | null;
}

export class AssessmentAggregateNotFoundError extends Error {
  constructor(assessmentId: string, ownerId: string) {
    super(`Assessment ${assessmentId} was not found for owner ${ownerId}.`);
    this.name = "AssessmentAggregateNotFoundError";
  }
}

export function loadAssessmentAggregate(
  params: LoadAssessmentAggregateParams,
): AssessmentAggregate {
  const assessmentRow = params.db
    .select({
      assessment: riskAssessment,
      workplace,
    })
    .from(riskAssessment)
    .innerJoin(workplace, eq(riskAssessment.workplaceId, workplace.id))
    .where(
      and(
        eq(riskAssessment.id, params.assessmentId),
        eq(riskAssessment.ownerId, params.ownerId),
        eq(workplace.ownerId, params.ownerId),
      ),
    )
    .get();

  if (!assessmentRow) {
    throw new AssessmentAggregateNotFoundError(params.assessmentId, params.ownerId);
  }

  const findings = params.db
    .select()
    .from(finding)
    .where(
      and(
        eq(finding.assessmentId, params.assessmentId),
        eq(finding.ownerId, params.ownerId),
      ),
    )
    .all();

  const riskEntries = findings.length === 0
    ? []
    : params.db
        .select()
        .from(riskEntry)
        .where(
          and(
            eq(riskEntry.ownerId, params.ownerId),
            inArray(
              riskEntry.findingId,
              findings.map((entry) => entry.id),
            ),
          ),
        )
        .all();

  const mitigationActions = riskEntries.length === 0
    ? []
    : params.db
        .select()
        .from(riskMitigationAction)
        .where(
          and(
            eq(riskMitigationAction.ownerId, params.ownerId),
            inArray(
              riskMitigationAction.riskEntryId,
              riskEntries.map((entry) => entry.id),
            ),
          ),
        )
        .orderBy(
          asc(riskMitigationAction.createdAt),
          asc(riskMitigationAction.id),
        )
        .all();

  const summary = params.db
    .select()
    .from(assessmentSummary)
    .where(
      and(
        eq(assessmentSummary.assessmentId, params.assessmentId),
        eq(assessmentSummary.ownerId, params.ownerId),
      ),
    )
    .get() ?? null;

  return {
    workplace: assessmentRow.workplace,
    assessment: assessmentRow.assessment,
    findings,
    riskEntries,
    mitigationActions,
    summary,
  };
}
