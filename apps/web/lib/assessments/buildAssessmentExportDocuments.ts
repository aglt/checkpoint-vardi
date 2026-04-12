import { getLegalReferenceByCode } from "@vardi/checklists";
import type {
  AssessmentReportDocuments,
  AssessmentReportBlock,
  AssessmentReportRow,
  AssessmentReportSection,
} from "@vardi/export";

import type { AssessmentReadModel } from "./loadAssessmentReadModel";
import type {
  AssessmentRiskMitigationActionProjection,
  AssessmentRiskRegisterEntryProjection,
  AssessmentRiskRegisterProjection,
} from "./loadAssessmentRiskRegisterProjection";
import type {
  AssessmentSummaryProjection,
} from "./loadAssessmentSummaryProjection";
import type { AssessmentSummaryPrioritizedEntry } from "./assessmentSummaryPriorityEntries";

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
  const exportContext = buildExportContext(params);

  return {
    checklist: buildChecklistDocument(params, exportContext),
    register: buildRegisterDocument(params, exportContext),
    summary: buildSummaryDocument(params, exportContext),
  };
}

function buildChecklistDocument(
  params: BuildAssessmentExportDocumentsParams,
  exportContext: AssessmentExportContext,
): AssessmentReportDocuments["checklist"] {
  return {
    title: "Assessment checklist observations",
    sections: [
      ...buildCommonSections(exportContext, {
        purpose:
          "Structured checklist observations captured from the saved workplace assessment walkthrough.",
      }),
      {
        title: "Checklist observations",
        description:
          "Checklist criteria remain ordered by the pinned seeded section and criterion sequence.",
        blocks: params.readModel.sections.flatMap((section) =>
          section.criteria.map((criterion) => ({
            title: `Criterion ${criterion.number} - ${criterion.translations.is.title}`,
            rows: [
              createRow("Checklist section", section.translations.is.title),
              createRow("Status", formatChecklistStatus(criterion.response.status)),
              createRow("Observation notes", criterion.response.notes ?? ""),
              createRow(
                "Legal reference linkage",
                formatLegalReferenceList(criterion.legalRefs),
              ),
            ],
          })),
        ),
      },
    ],
  };
}

function buildRegisterDocument(
  params: BuildAssessmentExportDocumentsParams,
  exportContext: AssessmentExportContext,
): AssessmentReportDocuments["register"] {
  return {
    title: "Assessment risk register and classification",
    sections: [
      ...buildCommonSections(exportContext, {
        purpose:
          "Saved transferred risk entries and saved classifications derived from the persisted assessment findings.",
      }),
      {
        title: "Risk register and classification",
        description:
          "Entries remain ordered by seeded checklist traceability and persisted transfer order.",
        blocks:
          params.riskRegisterProjection.entries.length > 0
            ? params.riskRegisterProjection.entries.map((entry, index) =>
                buildRiskRegisterBlock(entry, index),
              )
            : [
                {
                  title: "Risk register status",
                  rows: [
                    createRow(
                      "Transferred risk entries",
                      "No transferred risk entries were exported.",
                    ),
                  ],
                },
              ],
      },
      buildMitigationActionSection(params.riskRegisterProjection.entries),
    ],
  };
}

function buildSummaryDocument(
  params: BuildAssessmentExportDocumentsParams,
  exportContext: AssessmentExportContext,
): AssessmentReportDocuments["summary"] {
  return {
    title: "Assessment summary and priority overview",
    sections: [
      ...buildCommonSections(exportContext, {
        purpose:
          "Saved assessment summary content with a deterministic priority overview from the persisted risk register.",
      }),
      {
        title: "Assessment summary",
        rows: [
          createRow(
            "Participants",
            requireSavedSummaryField(
              params.summaryProjection.summary.saved.participants,
              "participants",
            ),
          ),
          createRow(
            "Method",
            requireSavedSummaryField(
              params.summaryProjection.summary.saved.method,
              "method",
            ),
          ),
          createRow(
            "Summary notes",
            requireSavedSummaryField(
              params.summaryProjection.summary.saved.notes,
              "notes",
            ),
          ),
        ],
      },
      buildPriorityOverviewSection(params.summaryProjection.prioritizedEntries),
    ],
  };
}

function buildCommonSections(
  exportContext: AssessmentExportContext,
  params: {
    readonly purpose: string;
  },
): AssessmentReportSection[] {
  const assessmentRecordRows: AssessmentReportRow[] = [
    createRow("Assessment id", exportContext.assessmentId),
    createRow("Assessment started", exportContext.assessmentStartedAt),
    createRow("Assessment date", exportContext.assessmentDate),
    createRow("Company", exportContext.companyName),
    createRow("Assessment location", exportContext.location),
  ];

  if (exportContext.assessmentCompletedAt) {
    assessmentRecordRows.push(
      createRow("Assessment completed", exportContext.assessmentCompletedAt),
    );
  }

  return [
    {
      title: "Assessment record",
      rows: assessmentRecordRows,
    },
    {
      title: "Workplace context",
      rows: [
        createRow("Workplace", exportContext.workplaceName),
        createRow("Workplace address", exportContext.workplaceAddress),
        createRow("Workplace archetype", exportContext.workplaceArchetype),
      ],
    },
    {
      title: "Template provenance",
      rows: [
        createRow("Checklist template", exportContext.checklistTitle),
        createRow("Checklist slug", exportContext.checklistSlug),
        createRow("Checklist version", exportContext.checklistVersion),
        createRow("Risk matrix", exportContext.riskMatrixDisplay),
      ],
    },
    {
      title: "Framing and provenance",
      rows: [
        createRow("Report purpose", params.purpose),
        createRow(
          "Saved-state provenance",
          "All included values come from saved assessment records and seeded runtime references pinned to this assessment.",
        ),
        createRow(
          "Assessment standing",
          "This export supports workplace review and follow-up. It does not certify legal compliance or regulatory approval.",
        ),
        ...buildUnresolvedReferenceRows(exportContext.unresolvedReferenceCodes),
      ],
    },
  ];
}

function buildMitigationActionSection(
  entries: readonly AssessmentRiskRegisterEntryProjection[],
): AssessmentReportSection {
  const actionableEntries = entries.flatMap((entry, index) =>
    entry.mitigationActions.length > 0 ? [{ entry, index }] : [],
  );

  if (actionableEntries.length === 0) {
    return {
      title: "Mitigation action plan",
      rows: [
        createRow("Saved mitigation actions", "No saved mitigation actions."),
      ],
    };
  }

  return {
    title: "Mitigation action plan",
    description:
      "Saved mitigation actions remain ordered by risk-entry traceability and mitigation-action creation time.",
    blocks: actionableEntries.map(({ entry, index }) => ({
      title: `Entry ${index + 1} - ${getRiskEntryDisplayTitle(entry)}`,
      rows: entry.mitigationActions.map((action, actionIndex) =>
        createRow(
          `Action ${actionIndex + 1}`,
          formatMitigationActionValue(action),
        ),
      ),
    })),
  };
}

function buildPriorityOverviewSection(
  prioritizedEntries: readonly AssessmentSummaryPrioritizedEntry[],
): AssessmentReportSection {
  return {
    title: "Priority risk overview",
    description:
      "Priority order follows verified saved risk severity first and saved register order second.",
    rows:
      prioritizedEntries.length > 0
        ? prioritizedEntries.map((entry, index) =>
            createRow(`Priority ${index + 1}`, formatPriorityOverviewValue(entry)),
          )
        : [
            createRow(
              "Prioritized risks",
              "No prioritized risk entries were exported.",
            ),
          ],
  };
}

function buildRiskRegisterBlock(
  entry: AssessmentRiskRegisterEntryProjection,
  index: number,
): AssessmentReportBlock {
  return {
    title: `Entry ${index + 1} - ${getRiskEntryDisplayTitle(entry)}`,
    rows: [
      createRow("Checklist section", entry.sectionTitle),
      createRow(
        "Criterion",
        `Criterion ${entry.criterionNumber} - ${entry.criterionTitle}`,
      ),
      createRow("Hazard", getRiskEntryDisplayTitle(entry)),
      createRow("Possible health effects", entry.healthEffects ?? ""),
      createRow("Who is at risk", entry.whoAtRisk ?? ""),
      createRow("Likelihood", formatOptionalNumber(entry.likelihood)),
      createRow("Consequence", formatOptionalNumber(entry.consequence)),
      createRow("Saved risk level", formatRiskLevel(entry.savedRiskLevel)),
      createRow(
        "Classification reasoning",
        entry.classificationReasoning ?? "",
      ),
      createRow("Current controls", entry.currentControls ?? ""),
      createRow("Cost estimate", formatOptionalNumber(entry.costEstimate)),
    ],
  };
}

function buildExportContext(
  params: BuildAssessmentExportDocumentsParams,
): AssessmentExportContext {
  return {
    assessmentId: params.readModel.assessment.id,
    assessmentStartedAt: formatTimestampUtc(params.readModel.assessment.startedAt),
    assessmentCompletedAt: params.readModel.assessment.completedAt
      ? formatTimestampUtc(params.readModel.assessment.completedAt)
      : null,
    assessmentDate: requireSavedSummaryField(
      params.summaryProjection.summary.saved.assessmentDate,
      "assessmentDate",
    ),
    companyName: requireSavedSummaryField(
      params.summaryProjection.summary.saved.companyName,
      "companyName",
    ),
    location: requireSavedSummaryField(
      params.summaryProjection.summary.saved.location,
      "location",
    ),
    workplaceName: params.readModel.workplace.name,
    workplaceAddress: params.readModel.workplace.address ?? "",
    workplaceArchetype: formatWorkplaceArchetype(
      params.readModel.workplace.archetype,
    ),
    checklistTitle: params.readModel.checklist.translations.is.title,
    checklistSlug: params.readModel.checklist.slug,
    checklistVersion: params.readModel.checklist.version,
    riskMatrixDisplay: `${params.riskRegisterProjection.riskMatrix.title} (${params.readModel.riskMatrix.slug})`,
    unresolvedReferenceCodes: collectUnresolvedReferenceCodes(params.readModel),
  };
}

function buildUnresolvedReferenceRows(
  unresolvedReferenceCodes: readonly string[],
): AssessmentReportRow[] {
  if (unresolvedReferenceCodes.length === 0) {
    return [];
  }

  return [
    createRow(
      "Unresolved legal-reference handling",
      `Unresolved imported legal references remain code-only linkage in this export: ${unresolvedReferenceCodes.join(", ")}.`,
    ),
  ];
}

function collectUnresolvedReferenceCodes(
  readModel: AssessmentReadModel,
): readonly string[] {
  const codes = new Set<string>();

  for (const code of readModel.sections.flatMap((section) =>
    section.criteria.flatMap((criterion) => criterion.legalRefs),
  )) {
    const legalReference = getLegalReferenceByCode(code);

    if (legalReference?.resolutionStatus === "unresolved_imported_code") {
      codes.add(code);
    }
  }

  return [...codes];
}

function createRow(label: string, value: string): AssessmentReportRow {
  return {
    label,
    value,
  };
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

function formatChecklistStatus(value: string): string {
  switch (value) {
    case "ok":
      return "Ok";
    case "notOk":
      return "Not ok";
    case "notApplicable":
      return "Not applicable";
    default:
      return "Unanswered";
  }
}

function formatLegalReferenceList(codes: readonly string[]): string {
  if (codes.length === 0) {
    return "No legal references listed.";
  }

  return codes.map(formatLegalReferenceDisplay).join(", ");
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

function formatMitigationActionValue(
  action: AssessmentRiskMitigationActionProjection,
): string {
  const parts = [
    action.description,
    `Status: ${formatRiskMitigationActionStatus(action.status)}`,
    action.assigneeName ? `Assignee: ${action.assigneeName}` : null,
    action.dueDate ? `Due: ${action.dueDate}` : null,
  ].filter((part): part is string => part != null);

  return parts.join(". ");
}

function formatOptionalNumber(value: number | null): string {
  return value == null ? "" : value.toString();
}

function formatPriorityOverviewValue(
  entry: AssessmentSummaryPrioritizedEntry,
): string {
  return [
    `Risk level: ${formatRiskLevel(entry.savedRiskLevel)}`,
    `Hazard: ${entry.hazard}`,
    `Checklist section: ${entry.sectionTitle}`,
    `Criterion ${entry.criterionNumber} - ${entry.criterionTitle}`,
  ].join(" | ");
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

function formatTimestampUtc(value: Date): string {
  const iso = value.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function formatWorkplaceArchetype(value: AssessmentReadModel["workplace"]["archetype"]): string {
  switch (value) {
    case "fixed":
      return "Fixed-location workplace";
    case "mobile":
      return "Mobile workplace";
    case "construction":
      return "Construction site";
  }
}

function getRiskEntryDisplayTitle(
  entry: AssessmentRiskRegisterEntryProjection,
): string {
  return entry.hazard.length > 0 ? entry.hazard : entry.criterionTitle;
}

interface AssessmentExportContext {
  readonly assessmentId: string;
  readonly assessmentStartedAt: string;
  readonly assessmentCompletedAt: string | null;
  readonly assessmentDate: string;
  readonly companyName: string;
  readonly location: string;
  readonly workplaceName: string;
  readonly workplaceAddress: string;
  readonly workplaceArchetype: string;
  readonly checklistTitle: string;
  readonly checklistSlug: string;
  readonly checklistVersion: string;
  readonly riskMatrixDisplay: string;
  readonly unresolvedReferenceCodes: readonly string[];
}
