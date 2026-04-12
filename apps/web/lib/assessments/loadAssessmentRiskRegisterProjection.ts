import { getRiskMatrixById, type RiskMatrix } from "@vardi/checklists";
import {
  loadAssessmentAggregate,
  loadAssessmentRiskMitigationActions,
  type RiskEntryRow,
  type RiskMitigationActionRow,
  type VardiDatabase,
} from "@vardi/db";
import { classifyRisk, type RiskLevel } from "@vardi/risk";

import {
  loadAssessmentReadModel,
  type AssessmentReadModel,
  type AssessmentCriterionReadModel,
  type AssessmentSectionReadModel,
} from "./loadAssessmentReadModel";

export interface LoadAssessmentRiskRegisterProjectionParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly readModel?: AssessmentReadModel;
}

export type RiskEntryClassificationState =
  | "ready"
  | "staleRiskLevel"
  | "invalidClassification";

export interface AssessmentRiskRegisterEntryProjection {
  readonly id: string;
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly criterionId: string;
  readonly criterionNumber: string;
  readonly criterionTitle: string;
  readonly findingId: string;
  readonly hazard: string;
  readonly healthEffects: string | null;
  readonly whoAtRisk: string | null;
  readonly likelihood: number | null;
  readonly consequence: number | null;
  readonly savedRiskLevel: RiskLevel | null;
  readonly classificationState: RiskEntryClassificationState;
  readonly classificationReasoning: string | null;
  readonly currentControls: string | null;
  readonly costEstimate: number | null;
  readonly mitigationActions: readonly AssessmentRiskMitigationActionProjection[];
}

export interface AssessmentRiskMitigationActionProjection {
  readonly id: string;
  readonly description: string;
  readonly assigneeName: string | null;
  readonly dueDate: string | null;
  readonly status: "open" | "inProgress" | "done";
}

export interface AssessmentRiskRegisterProjection {
  readonly assessmentId: string;
  readonly riskMatrix: {
    readonly id: string;
    readonly title: string;
    readonly likelihoodLevels: number;
    readonly consequenceLevels: number;
  };
  readonly entries: readonly AssessmentRiskRegisterEntryProjection[];
}

// This is the app-owned projection for the risk-register editor surface.
export function loadAssessmentRiskRegisterProjection(
  params: LoadAssessmentRiskRegisterProjectionParams,
): AssessmentRiskRegisterProjection {
  const readModel = params.readModel ?? loadAssessmentReadModel(params);
  const aggregate = loadAssessmentAggregate(params);
  const mitigationActions = loadAssessmentRiskMitigationActions({
    db: params.db,
    ownerId: params.ownerId,
    assessmentId: params.assessmentId,
  });
  const riskMatrix = getRiskMatrixById(readModel.riskMatrix.id);

  if (!riskMatrix) {
    throw new Error(
      `Assessment ${params.assessmentId} references unknown risk matrix ${readModel.riskMatrix.id}.`,
    );
  }

  const riskEntryByFindingId = new Map(
    aggregate.riskEntries.map((entry) => [entry.findingId, entry] as const),
  );
  const mitigationActionsByRiskEntryId = new Map<string, RiskMitigationActionRow[]>();

  for (const action of mitigationActions) {
    const existingActions = mitigationActionsByRiskEntryId.get(action.riskEntryId) ?? [];
    existingActions.push(action);
    mitigationActionsByRiskEntryId.set(action.riskEntryId, existingActions);
  }

  return {
    assessmentId: readModel.assessment.id,
    riskMatrix: {
      id: riskMatrix.id,
      title: riskMatrix.translations.is.title,
      likelihoodLevels: riskMatrix.likelihoodLevels,
      consequenceLevels: riskMatrix.consequenceLevels,
    },
    entries: readModel.sections.flatMap((section) =>
      section.criteria.flatMap((criterion) => {
        const findingId = criterion.response.id;

        if (!findingId) {
          return [];
        }

        const riskEntry = riskEntryByFindingId.get(findingId);

        if (!riskEntry) {
          return [];
        }

        return [
          buildRiskRegisterEntryProjection(
            section,
            criterion,
            riskEntry,
            riskMatrix,
            mitigationActionsByRiskEntryId.get(riskEntry.id) ?? [],
          ),
        ];
      }),
    ),
  };
}

function buildRiskRegisterEntryProjection(
  section: AssessmentSectionReadModel,
  criterion: AssessmentCriterionReadModel,
  riskEntry: RiskEntryRow,
  riskMatrix: RiskMatrix,
  mitigationActions: readonly RiskMitigationActionRow[],
): AssessmentRiskRegisterEntryProjection {
  try {
    const derivedRiskLevel = classifyRisk({
      matrix: {
        likelihoodLevels: riskMatrix.likelihoodLevels,
        consequenceLevels: riskMatrix.consequenceLevels,
        lookup: riskMatrix.lookup,
      },
      likelihood: riskEntry.likelihood,
      consequence: riskEntry.consequence,
    });
    const isStale = derivedRiskLevel !== riskEntry.riskLevel;

    return {
      id: riskEntry.id,
      sectionId: section.id,
      sectionTitle: section.translations.is.title,
      criterionId: criterion.id,
      criterionNumber: criterion.number,
      criterionTitle: criterion.translations.is.title,
      findingId: riskEntry.findingId,
      hazard: riskEntry.hazard ?? "",
      healthEffects: riskEntry.healthEffects,
      whoAtRisk: riskEntry.whoAtRisk,
      likelihood: riskEntry.likelihood,
      consequence: riskEntry.consequence,
      savedRiskLevel: isStale ? null : riskEntry.riskLevel,
      classificationState: isStale ? "staleRiskLevel" : "ready",
      classificationReasoning: riskEntry.classificationReasoning,
      currentControls: riskEntry.currentControls,
      costEstimate: riskEntry.costEstimate,
      mitigationActions: mitigationActions.map(buildRiskMitigationActionProjection),
    };
  } catch {
    return {
      id: riskEntry.id,
      sectionId: section.id,
      sectionTitle: section.translations.is.title,
      criterionId: criterion.id,
      criterionNumber: criterion.number,
      criterionTitle: criterion.translations.is.title,
      findingId: riskEntry.findingId,
      hazard: riskEntry.hazard ?? "",
      healthEffects: riskEntry.healthEffects,
      whoAtRisk: riskEntry.whoAtRisk,
      likelihood: riskEntry.likelihood,
      consequence: riskEntry.consequence,
      savedRiskLevel: null,
      classificationState: "invalidClassification",
      classificationReasoning: riskEntry.classificationReasoning,
      currentControls: riskEntry.currentControls,
      costEstimate: riskEntry.costEstimate,
      mitigationActions: mitigationActions.map(buildRiskMitigationActionProjection),
    };
  }
}

function buildRiskMitigationActionProjection(
  action: RiskMitigationActionRow,
): AssessmentRiskMitigationActionProjection {
  return {
    id: action.id,
    description: action.description,
    assigneeName: action.assigneeName,
    dueDate: formatDateOnly(action.dueDate),
    status: action.status,
  };
}

function formatDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
