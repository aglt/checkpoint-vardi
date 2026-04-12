import { getLegalReferenceByCode } from "@vardi/checklists";
import type {
  AssessmentReportDocuments,
  ChecklistCriterionStatus,
} from "@vardi/export";

import type { AssessmentReadModel } from "./loadAssessmentReadModel";
import type { AssessmentRiskRegisterProjection } from "./loadAssessmentRiskRegisterProjection";
import type { AssessmentSummaryProjection } from "./loadAssessmentSummaryProjection";

export interface BuildAssessmentExportDocumentsParams {
  readonly readModel: AssessmentReadModel;
  readonly riskRegisterProjection: AssessmentRiskRegisterProjection;
  readonly summaryProjection: AssessmentSummaryProjection;
}

export class AssessmentExportDocumentIntegrityError extends Error {
  constructor(field: string) {
    super(`Assessment export requires persisted summary field ${field}.`);
    this.name = "AssessmentExportDocumentIntegrityError";
  }
}

export function buildAssessmentExportDocuments(
  params: BuildAssessmentExportDocumentsParams,
): AssessmentReportDocuments {
  const sharedHeader = buildSharedHeader(params);

  return {
    checklist: {
      ...sharedHeader,
      checklistTitle: params.readModel.checklist.translations.is.title,
      checklistVersion: params.readModel.checklist.version,
      sections: params.readModel.sections.map((section) => ({
        id: section.id,
        title: section.translations.is.title,
        criteria: section.criteria.map((criterion) => ({
          id: criterion.id,
          number: criterion.number,
          title: criterion.translations.is.title,
          status: criterion.response.status as ChecklistCriterionStatus,
          notes: criterion.response.notes ?? "",
          legalReferences: criterion.legalRefs.map(formatLegalReferenceDisplay),
        })),
      })),
    },
    register: {
      ...sharedHeader,
      checklistTitle: params.readModel.checklist.translations.is.title,
      riskMatrixTitle: params.riskRegisterProjection.riskMatrix.title,
      entries: params.riskRegisterProjection.entries.map((entry) => ({
        id: entry.id,
        sectionTitle: entry.sectionTitle,
        criterionNumber: entry.criterionNumber,
        criterionTitle: entry.criterionTitle,
        hazard: entry.hazard,
        healthEffects: entry.healthEffects ?? "",
        whoAtRisk: entry.whoAtRisk ?? "",
        likelihood: formatOptionalNumber(entry.likelihood),
        consequence: formatOptionalNumber(entry.consequence),
        riskLevel: formatRiskLevel(entry.savedRiskLevel),
        classificationReasoning: entry.classificationReasoning ?? "",
        currentControls: entry.currentControls ?? "",
        costEstimate: formatOptionalNumber(entry.costEstimate),
        mitigationActions: entry.mitigationActions.map((action) => ({
          id: action.id,
          description: action.description,
          assigneeName: action.assigneeName ?? "",
          dueDate: action.dueDate ?? "",
          statusLabel: formatRiskMitigationActionStatus(action.status),
        })),
      })),
    },
    summary: {
      ...sharedHeader,
      checklistTitle: params.readModel.checklist.translations.is.title,
      participants: requireSavedSummaryField(
        params.summaryProjection.summary.saved.participants,
        "participants",
      ),
      method: requireSavedSummaryField(
        params.summaryProjection.summary.saved.method,
        "method",
      ),
      notes: requireSavedSummaryField(
        params.summaryProjection.summary.saved.notes,
        "notes",
      ),
    },
  };
}

function buildSharedHeader(
  params: BuildAssessmentExportDocumentsParams,
) {
  return {
    assessmentId: params.readModel.assessment.id,
    workplaceName: params.readModel.workplace.name,
    workplaceAddress: params.readModel.workplace.address,
    companyName: requireSavedSummaryField(
      params.summaryProjection.summary.saved.companyName,
      "companyName",
    ),
    location: requireSavedSummaryField(
      params.summaryProjection.summary.saved.location,
      "location",
    ),
    assessmentDate: requireSavedSummaryField(
      params.summaryProjection.summary.saved.assessmentDate,
      "assessmentDate",
    ),
  } as const;
}

function requireSavedSummaryField(
  value: string | null,
  field: string,
): string {
  if (value == null || value.trim().length === 0) {
    throw new AssessmentExportDocumentIntegrityError(field);
  }

  return value;
}

function formatOptionalNumber(value: number | null): string {
  return value == null ? "" : value.toString();
}

function formatRiskLevel(value: "low" | "medium" | "high" | null): string {
  if (value == null) {
    return "";
  }

  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

function formatRiskMitigationActionStatus(
  value: "open" | "inProgress" | "done",
): string {
  if (value === "inProgress") {
    return "In progress";
  }

  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

function formatLegalReferenceDisplay(code: string): string {
  const legalReference = getLegalReferenceByCode(code);

  if (!legalReference) {
    return code;
  }

  if (legalReference.resolutionStatus === "unresolved_imported_code") {
    return code;
  }

  return `${legalReference.code} - ${legalReference.translations.is.title}`;
}
