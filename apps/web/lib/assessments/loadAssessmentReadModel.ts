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
import {
  classifyRisk,
  type RiskLevel,
} from "@vardi/risk";

export interface LoadAssessmentReadModelParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
}

export type PresenceStatus = "present" | "absent";

export interface AssessmentCriterionResponseReadModel {
  readonly id: string | null;
  readonly status: FindingRow["status"];
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
  readonly riskEntry: AssessmentRiskEntryReadModel | null;
}

export interface AssessmentSectionReadModel {
  readonly id: string;
  readonly order: number;
  readonly translations: SeedChecklist["sections"][number]["translations"];
  readonly criteria: readonly AssessmentCriterionReadModel[];
}

export interface AssessmentRiskEntryReadModel {
  readonly id: string;
  readonly hazard: string;
  readonly healthEffects: string | null;
  readonly whoAtRisk: string | null;
  readonly likelihood: number | null;
  readonly consequence: number | null;
  readonly riskLevel: RiskLevel | null;
  readonly currentControls: string | null;
  readonly proposedAction: string | null;
  readonly costEstimate: number | null;
  readonly responsibleOwner: string | null;
  readonly dueDate: string | null;
  readonly completedAt: string | null;
}

export interface AssessmentReadModel {
  readonly workplace: WorkplaceRow;
  readonly assessment: RiskAssessmentRow;
  readonly checklist: Pick<SeedChecklist, "id" | "slug" | "version" | "defaultLanguage" | "translations">;
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
  const riskEntryByFindingId = new Map(
    aggregate.riskEntries.map((entry) => [entry.findingId, entry] as const),
  );

  return {
    workplace: aggregate.workplace,
    assessment: aggregate.assessment,
    checklist: {
      id: checklist.id,
      slug: checklist.slug,
      version: checklist.version,
      defaultLanguage: checklist.defaultLanguage,
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
        const riskEntryRow = responseRow
          ? riskEntryByFindingId.get(responseRow.id)
          : undefined;
        const riskEntry = riskEntryRow
          ? buildRiskEntryReadModel(aggregate.assessment.id, riskMatrix, riskEntryRow)
          : null;

        return {
          id: criterion.id,
          number: criterion.number,
          order: criterion.order,
          legalRefs: criterion.legalRefs,
          translations: criterion.translations,
          response: {
            id: responseRow?.id ?? null,
            status: responseRow?.status ?? "unanswered",
            notes: responseRow?.notes ?? null,
            voiceTranscript: responseRow?.voiceTranscript ?? null,
            notesLanguage: responseRow?.notesLanguage ?? null,
          },
          riskEntryStatus: riskEntry ? "present" : "absent",
          riskEntry,
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

function buildRiskEntryReadModel(
  assessmentId: string,
  riskMatrix: RiskMatrix,
  riskEntry: AssessmentAggregate["riskEntries"][number],
): AssessmentRiskEntryReadModel {
  let derivedRiskLevel: RiskLevel | null;

  try {
    derivedRiskLevel = classifyRisk({
      matrix: {
        likelihoodLevels: riskMatrix.likelihoodLevels,
        consequenceLevels: riskMatrix.consequenceLevels,
        lookup: riskMatrix.lookup,
      },
      likelihood: riskEntry.likelihood,
      consequence: riskEntry.consequence,
    });
  } catch (error) {
    throw new AssessmentReadModelIntegrityError(
      `Assessment ${assessmentId} contains an invalid risk entry classification for ${riskEntry.id}: ${error instanceof Error ? error.message : "unknown classification failure"}`,
    );
  }

  if (derivedRiskLevel !== riskEntry.riskLevel) {
    throw new AssessmentReadModelIntegrityError(
      `Assessment ${assessmentId} contains a stale risk level for ${riskEntry.id}.`,
    );
  }

  return {
    id: riskEntry.id,
    hazard: riskEntry.hazard ?? "",
    healthEffects: riskEntry.healthEffects,
    whoAtRisk: riskEntry.whoAtRisk,
    likelihood: riskEntry.likelihood,
    consequence: riskEntry.consequence,
    riskLevel: derivedRiskLevel,
    currentControls: riskEntry.currentControls,
    proposedAction: riskEntry.proposedAction,
    costEstimate: riskEntry.costEstimate,
    responsibleOwner: riskEntry.responsibleOwner,
    dueDate: formatDateOnly(riskEntry.dueDate),
    completedAt: formatDateOnly(riskEntry.completedAt),
  };
}

function formatDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
