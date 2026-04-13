import { randomUUID } from "node:crypto";

import { and, eq, inArray, isNotNull } from "drizzle-orm";

import type { VardiDatabase } from "./database.js";
import { finding, riskEntry } from "./schema.js";

export interface TransferAssessmentFindingsToRiskRegisterParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly hazardByCriterionId: Readonly<Record<string, string>>;
}

export interface TransferAssessmentFindingsToRiskRegisterResult {
  readonly assessmentId: string;
  readonly eligibleFindingCount: number;
  readonly createdRiskEntryCount: number;
  readonly existingRiskEntryCount: number;
}

export class MissingRiskEntryHazardError extends Error {
  constructor(assessmentId: string, criterionId: string) {
    super(
      `Risk transfer for assessment ${assessmentId} is missing an initial hazard for criterion ${criterionId}.`,
    );
    this.name = "MissingRiskEntryHazardError";
  }
}

// This is the package-owned transactional write seam for walkthrough-to-register transfer.
export function transferAssessmentFindingsToRiskRegister(
  params: TransferAssessmentFindingsToRiskRegisterParams,
): TransferAssessmentFindingsToRiskRegisterResult {
  return params.db.transaction((tx) => {
    const eligibleFindings = tx
      .select()
      .from(finding)
      .where(
        and(
          eq(finding.ownerId, params.ownerId),
          eq(finding.assessmentId, params.assessmentId),
          eq(finding.status, "notOk"),
          isNotNull(finding.attentionSeverity),
        ),
      )
      .all();

    if (eligibleFindings.length === 0) {
      return {
        assessmentId: params.assessmentId,
        eligibleFindingCount: 0,
        createdRiskEntryCount: 0,
        existingRiskEntryCount: 0,
      };
    }

    const existingEntries = tx
      .select({
        findingId: riskEntry.findingId,
      })
      .from(riskEntry)
      .where(
        and(
          eq(riskEntry.ownerId, params.ownerId),
          inArray(
            riskEntry.findingId,
            eligibleFindings.map((entry) => entry.id),
          ),
        ),
      )
      .all();

    const existingFindingIds = new Set(
      existingEntries.map((entry) => entry.findingId),
    );
    const findingsToInsert = eligibleFindings.filter(
      (entry) => !existingFindingIds.has(entry.id),
    );

    if (findingsToInsert.length > 0) {
      tx.insert(riskEntry).values(
        findingsToInsert.map((entry) => {
          const hazard = params.hazardByCriterionId[entry.criterionId];

          if (!hazard) {
            throw new MissingRiskEntryHazardError(
              params.assessmentId,
              entry.criterionId,
            );
          }

          return {
            id: randomUUID(),
            ownerId: params.ownerId,
            findingId: entry.id,
            hazard,
            healthEffects: null,
            whoAtRisk: null,
            likelihood: null,
            consequence: null,
            riskLevel: null,
            currentControls: null,
            controlHierarchy: null,
            costEstimate: null,
          };
        }),
      ).run();
    }

    return {
      assessmentId: params.assessmentId,
      eligibleFindingCount: eligibleFindings.length,
      createdRiskEntryCount: findingsToInsert.length,
      existingRiskEntryCount: existingEntries.length,
    };
  });
}
