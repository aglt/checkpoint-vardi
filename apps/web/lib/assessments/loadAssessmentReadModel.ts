import {
  getRiskMatrixById,
  getSeedChecklistById,
  type RiskMatrix,
  type SeedChecklist,
} from "@vardi/checklists";
import {
  loadAssessmentAggregate,
  type AssessmentAggregate,
  type AssessmentSummaryRow,
  type FindingRow,
  type RiskAssessmentRow,
  type VardiDatabase,
  type WorkplaceRow,
} from "@vardi/db";

export interface LoadAssessmentReadModelParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
}

export type PresenceStatus = "present" | "absent";

export interface AssessmentCriterionResponseReadModel {
  readonly id: string | null;
  readonly status: FindingRow["status"];
  readonly attentionSeverity: FindingRow["attentionSeverity"];
  readonly notes: string | null;
  readonly voiceTranscript: string | null;
  readonly notesLanguage: string | null;
}

export interface AssessmentCriterionReadModel {
  readonly id: string;
  readonly number: string;
  readonly order: number;
  readonly legalRefs: readonly string[];
  readonly translations: SeedChecklist["sections"][number]["criteria"][number]["translations"];
  readonly response: AssessmentCriterionResponseReadModel;
  readonly riskEntryStatus: PresenceStatus;
}

export interface AssessmentSectionReadModel {
  readonly id: string;
  readonly order: number;
  readonly translations: SeedChecklist["sections"][number]["translations"];
  readonly criteria: readonly AssessmentCriterionReadModel[];
}

export interface AssessmentReadModel {
  readonly workplace: WorkplaceRow;
  readonly assessment: RiskAssessmentRow;
  readonly checklist: Pick<
    SeedChecklist,
    "id" | "slug" | "version" | "defaultLanguage" | "workflowRules" | "translations"
  >;
  readonly riskMatrix: Pick<RiskMatrix, "id" | "slug" | "likelihoodLevels" | "consequenceLevels" | "translations">;
  readonly summaryStatus: PresenceStatus;
  readonly sections: readonly AssessmentSectionReadModel[];
}

export class AssessmentReadModelIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentReadModelIntegrityError";
  }
}

// This is the only supported app-owned composition seam for assessment walkthrough reads.
export function loadAssessmentReadModel(
  params: LoadAssessmentReadModelParams,
): AssessmentReadModel {
  const aggregate = loadAssessmentAggregate({
    db: params.db,
    ownerId: params.ownerId,
    assessmentId: params.assessmentId,
  });

  const checklist = resolveChecklist(aggregate);
  const riskMatrix = resolveRiskMatrix(aggregate);
  const validCriterionIds = new Set(
    checklist.sections.flatMap((section) => section.criteria.map((criterion) => criterion.id)),
  );

  for (const responseRow of aggregate.findings) {
    if (!validCriterionIds.has(responseRow.criterionId)) {
      throw new AssessmentReadModelIntegrityError(
        `Assessment ${aggregate.assessment.id} contains orphaned criterion ${responseRow.criterionId}.`,
      );
    }
  }

  const responseByCriterionId = new Map(
    aggregate.findings.map((responseRow) => [responseRow.criterionId, responseRow] as const),
  );
  const riskEntryFindingIds = new Set(
    aggregate.riskEntries.map((entry) => entry.findingId),
  );

  return {
    workplace: aggregate.workplace,
    assessment: aggregate.assessment,
    checklist: {
      id: checklist.id,
      slug: checklist.slug,
      version: checklist.version,
      defaultLanguage: checklist.defaultLanguage,
      workflowRules: checklist.workflowRules,
      translations: checklist.translations,
    },
    riskMatrix: {
      id: riskMatrix.id,
      slug: riskMatrix.slug,
      likelihoodLevels: riskMatrix.likelihoodLevels,
      consequenceLevels: riskMatrix.consequenceLevels,
      translations: riskMatrix.translations,
    },
    summaryStatus: toPresenceStatus(aggregate.summary),
    sections: checklist.sections.map((section) => ({
      id: section.id,
      order: section.order,
      translations: section.translations,
      criteria: section.criteria.map((criterion) => {
        const responseRow = responseByCriterionId.get(criterion.id);

        return {
          id: criterion.id,
          number: criterion.number,
          order: criterion.order,
          legalRefs: criterion.legalRefs,
          translations: criterion.translations,
          response: {
            id: responseRow?.id ?? null,
            status: responseRow?.status ?? "unanswered",
            attentionSeverity: responseRow?.attentionSeverity ?? null,
            notes: responseRow?.notes ?? null,
            voiceTranscript: responseRow?.voiceTranscript ?? null,
            notesLanguage: responseRow?.notesLanguage ?? null,
          },
          riskEntryStatus:
            responseRow && riskEntryFindingIds.has(responseRow.id) ? "present" : "absent",
        };
      }),
    })),
  };
}

function resolveChecklist(aggregate: AssessmentAggregate): SeedChecklist {
  const checklist = getSeedChecklistById(aggregate.assessment.checklistId);
  if (!checklist) {
    throw new AssessmentReadModelIntegrityError(
      `Assessment ${aggregate.assessment.id} references unknown checklist ${aggregate.assessment.checklistId}.`,
    );
  }

  if (checklist.slug !== aggregate.assessment.checklistSlug) {
    throw new AssessmentReadModelIntegrityError(
      `Assessment ${aggregate.assessment.id} checklist slug mismatch: expected ${aggregate.assessment.checklistSlug}, received ${checklist.slug}.`,
    );
  }

  if (checklist.version !== aggregate.assessment.checklistVersion) {
    throw new AssessmentReadModelIntegrityError(
      `Assessment ${aggregate.assessment.id} checklist version mismatch: expected ${aggregate.assessment.checklistVersion}, received ${checklist.version}.`,
    );
  }

  return checklist;
}

function resolveRiskMatrix(aggregate: AssessmentAggregate): RiskMatrix {
  const riskMatrix = getRiskMatrixById(aggregate.assessment.riskMatrixId);
  if (!riskMatrix) {
    throw new AssessmentReadModelIntegrityError(
      `Assessment ${aggregate.assessment.id} references unknown risk matrix ${aggregate.assessment.riskMatrixId}.`,
    );
  }

  return riskMatrix;
}

function toPresenceStatus(value: AssessmentSummaryRow | null): PresenceStatus {
  return value ? "present" : "absent";
}
