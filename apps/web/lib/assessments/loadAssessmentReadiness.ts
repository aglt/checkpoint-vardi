import { loadAssessmentReadModel, type LoadAssessmentReadModelParams } from "./loadAssessmentReadModel";

export interface AssessmentReadiness {
  readonly assessmentId: string;
  readonly workplaceName: string;
  readonly checklistTitle: string;
  readonly riskMatrixTitle: string;
  readonly sectionCount: number;
  readonly criterionCount: number;
}

// Narrow post-create readiness view for S1-03. Walkthrough rendering starts in S1-04.
export function loadAssessmentReadiness(
  params: LoadAssessmentReadModelParams,
): AssessmentReadiness {
  const readModel = loadAssessmentReadModel(params);

  return {
    assessmentId: readModel.assessment.id,
    workplaceName: readModel.workplace.name,
    checklistTitle: readModel.checklist.translations.is.title,
    riskMatrixTitle: readModel.riskMatrix.translations.is.title,
    sectionCount: readModel.sections.length,
    criterionCount: readModel.sections.reduce(
      (count, section) => count + section.criteria.length,
      0,
    ),
  };
}
