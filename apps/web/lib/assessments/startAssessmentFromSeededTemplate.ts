import {
  getRiskMatrixBySlug,
  getSeedChecklistById,
  type RiskMatrix,
  type SeedChecklist,
} from "@vardi/checklists";
import {
  createWorkplaceAssessment,
  type CreateWorkplaceAssessmentParams,
  type CreateWorkplaceAssessmentResult,
  type VardiDatabase,
} from "@vardi/db";
import type {
  StartAssessmentFromSeededTemplateInput,
  StartAssessmentFromSeededTemplateOutput,
} from "@vardi/schemas";

const FIXED_RISK_MATRIX_SLUG = "course-3x3";

export interface StartAssessmentFromSeededTemplateParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly input: StartAssessmentFromSeededTemplateInput;
  readonly writeAssessment?: (
    params: CreateWorkplaceAssessmentParams,
  ) => CreateWorkplaceAssessmentResult;
  readonly seedRuntime?: {
    readonly getChecklistById?: (id: string) => SeedChecklist | undefined;
    readonly getRiskMatrixBySlug?: (slug: string) => RiskMatrix | undefined;
  };
}

export class SeedChecklistNotFoundError extends Error {
  constructor(checklistId: string) {
    super(`Seed checklist ${checklistId} was not found.`);
    this.name = "SeedChecklistNotFoundError";
  }
}

export class SeedRiskMatrixNotFoundError extends Error {
  constructor(matrixSlug: string) {
    super(`Seed risk matrix ${matrixSlug} was not found.`);
    this.name = "SeedRiskMatrixNotFoundError";
  }
}

export function startAssessmentFromSeededTemplate(
  params: StartAssessmentFromSeededTemplateParams,
): StartAssessmentFromSeededTemplateOutput {
  const checklist = resolveChecklist(params);
  const riskMatrix = resolveRiskMatrix(params);
  const criterionIds = flattenChecklistCriterionIds(checklist);
  const writeAssessment = params.writeAssessment ?? createWorkplaceAssessment;
  const result = writeAssessment({
    db: params.db,
    ownerId: params.ownerId,
    workplace: {
      name: params.input.workplaceName,
      address: params.input.workplaceAddress,
      archetype: params.input.workplaceArchetype,
      primaryLanguage: "is",
    },
    assessment: {
      checklistId: checklist.id,
      checklistSlug: checklist.slug,
      checklistVersion: checklist.version,
      riskMatrixId: riskMatrix.id,
      startedAt: new Date(),
    },
    criterionIds,
  });

  return {
    assessmentId: result.assessmentId,
  };
}

function resolveChecklist(
  params: StartAssessmentFromSeededTemplateParams,
): SeedChecklist {
  const resolveById = params.seedRuntime?.getChecklistById ?? getSeedChecklistById;
  const checklist = resolveById(params.input.checklistId);

  if (!checklist) {
    throw new SeedChecklistNotFoundError(params.input.checklistId);
  }

  return checklist;
}

function resolveRiskMatrix(
  params: StartAssessmentFromSeededTemplateParams,
): RiskMatrix {
  const resolveBySlug =
    params.seedRuntime?.getRiskMatrixBySlug ?? getRiskMatrixBySlug;
  const riskMatrix = resolveBySlug(FIXED_RISK_MATRIX_SLUG);

  if (!riskMatrix) {
    throw new SeedRiskMatrixNotFoundError(FIXED_RISK_MATRIX_SLUG);
  }

  return riskMatrix;
}

function flattenChecklistCriterionIds(
  checklist: SeedChecklist,
): readonly string[] {
  return checklist.sections.flatMap((section) =>
    section.criteria.map((criterion) => criterion.id),
  );
}
