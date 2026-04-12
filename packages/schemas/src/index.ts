// @vardi/schemas — Zod contracts shared between UI and API route handlers.
// Implementation lands with its corresponding local user stories under user_stories/.
import { z } from "zod";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function trimOptionalString(value: unknown): unknown {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? undefined : trimmedValue;
}

function normalizeOptionalInteger(value: unknown): unknown {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  return Number(trimmedValue);
}

function isDateOnlyValue(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const normalizedDate = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(normalizedDate.getTime()) &&
    normalizedDate.toISOString().slice(0, 10) === value
  );
}

const optionalDateOnlySchema = z.preprocess(
  trimOptionalString,
  z
    .string()
    .refine(isDateOnlyValue, "Date must use YYYY-MM-DD format.")
    .optional(),
);

export const workplaceArchetypeSchema = z.enum([
  "fixed",
  "mobile",
  "construction",
]);

export const assessmentWalkthroughStatusSchema = z.enum([
  "ok",
  "notOk",
  "notApplicable",
  "unanswered",
]);

export const saveAssessmentCriterionStatusSchema = z.enum([
  "ok",
  "notOk",
  "notApplicable",
]);

export const riskMitigationActionStatusSchema = z.enum([
  "open",
  "inProgress",
  "done",
]);

export const startAssessmentFromSeededTemplateInputSchema = z.object({
  workplaceName: z.preprocess(
    trimString,
    z.string().min(1, "Workplace name is required.").max(200),
  ),
  workplaceAddress: z.preprocess(
    trimOptionalString,
    z.string().max(300).optional(),
  ),
  workplaceArchetype: workplaceArchetypeSchema,
  checklistId: z.preprocess(
    trimString,
    z.string().min(1, "Checklist id is required.").max(200),
  ),
});

export const startAssessmentFromSeededTemplateOutputSchema = z.object({
  assessmentId: z.string().min(1),
});

export const saveAssessmentCriterionResponseInputSchema = z.object({
  criterionId: z.preprocess(
    trimString,
    z.string().min(1, "Criterion id is required.").max(200),
  ),
  status: saveAssessmentCriterionStatusSchema,
  notes: z.preprocess(
    trimOptionalString,
    z.string().max(4000, "Notes must be 4000 characters or fewer.").optional(),
  ),
});

export const saveAssessmentCriterionResponseOutputSchema = z.object({
  assessmentId: z.string().min(1),
  criterionId: z.string().min(1),
  status: saveAssessmentCriterionStatusSchema,
  notes: z.string().nullable(),
  updatedAt: z.string().datetime(),
});

export const saveAssessmentRiskEntryInputSchema = z
  .object({
    riskEntryId: z.preprocess(
      trimString,
      z.string().min(1, "Risk entry id is required.").max(200),
    ),
    hazard: z.preprocess(
      trimString,
      z.string().min(1, "Hazard is required.").max(500),
    ),
    healthEffects: z.preprocess(
      trimOptionalString,
      z
        .string()
        .max(4000, "Health effects must be 4000 characters or fewer.")
        .optional(),
    ),
    whoAtRisk: z.preprocess(
      trimOptionalString,
      z
        .string()
        .max(4000, "Who is at risk must be 4000 characters or fewer.")
        .optional(),
    ),
    likelihood: z.preprocess(
      normalizeOptionalInteger,
      z.number().int().positive().optional(),
    ),
    consequence: z.preprocess(
      normalizeOptionalInteger,
      z.number().int().positive().optional(),
    ),
    // Classification-only reasoning for the saved risk score. Do not reuse this
    // field for mitigation or reviewer-note semantics.
    classificationReasoning: z.preprocess(
      trimOptionalString,
      z
        .string()
        .max(4000, "Classification reasoning must be 4000 characters or fewer.")
        .optional(),
    ),
    currentControls: z.preprocess(
      trimOptionalString,
      z
        .string()
        .max(4000, "Current controls must be 4000 characters or fewer.")
        .optional(),
    ),
    costEstimate: z.preprocess(
      normalizeOptionalInteger,
      z.number().int().nonnegative().optional(),
    ),
  })
  .strict();

export const createAssessmentRiskMitigationActionInputSchema = z
  .object({
    riskEntryId: z.preprocess(
      trimString,
      z.string().min(1, "Risk entry id is required.").max(200),
    ),
    description: z.preprocess(
      trimString,
      z
        .string()
        .min(1, "Description is required.")
        .max(4000, "Description must be 4000 characters or fewer."),
    ),
    assigneeName: z.preprocess(
      trimOptionalString,
      z
        .string()
        .max(200, "Assignee name must be 200 characters or fewer.")
        .optional(),
    ),
    dueDate: optionalDateOnlySchema,
    status: riskMitigationActionStatusSchema,
  })
  .strict();

export const updateAssessmentRiskMitigationActionInputSchema = z
  .object({
    mitigationActionId: z.preprocess(
      trimString,
      z.string().min(1, "Mitigation action id is required.").max(200),
    ),
    description: z.preprocess(
      trimString,
      z
        .string()
        .min(1, "Description is required.")
        .max(4000, "Description must be 4000 characters or fewer."),
    ),
    assigneeName: z.preprocess(
      trimOptionalString,
      z
        .string()
        .max(200, "Assignee name must be 200 characters or fewer.")
        .optional(),
    ),
    dueDate: optionalDateOnlySchema,
    status: riskMitigationActionStatusSchema,
  })
  .strict();

export const deleteAssessmentRiskMitigationActionInputSchema = z
  .object({
    mitigationActionId: z.preprocess(
      trimString,
      z.string().min(1, "Mitigation action id is required.").max(200),
    ),
  })
  .strict();

export const assessmentSummaryRequiredFieldSchema = z.enum([
  "companyName",
  "location",
  "assessmentDate",
  "participants",
  "method",
  "notes",
]);

export const assessmentExportReadinessSchema = z.object({
  exportReady: z.boolean(),
  walkthrough: z.object({
    ready: z.boolean(),
    unansweredCriterionCount: z.number().int().nonnegative(),
  }),
  transfer: z.object({
    ready: z.boolean(),
    eligibleFindingCount: z.number().int().nonnegative(),
    missingRiskEntryCount: z.number().int().nonnegative(),
  }),
  classification: z.object({
    ready: z.boolean(),
    transferredRiskEntryCount: z.number().int().nonnegative(),
    unclassifiedRiskEntryCount: z.number().int().nonnegative(),
    staleRiskEntryCount: z.number().int().nonnegative(),
    invalidRiskEntryCount: z.number().int().nonnegative(),
  }),
  summary: z.object({
    ready: z.boolean(),
    missingFields: z.array(assessmentSummaryRequiredFieldSchema),
  }),
});

export const saveAssessmentSummaryInputSchema = z
  .object({
    companyName: z.preprocess(
      trimOptionalString,
      z.string().max(200, "Company name must be 200 characters or fewer.").optional(),
    ),
    location: z.preprocess(
      trimOptionalString,
      z.string().max(300, "Location must be 300 characters or fewer.").optional(),
    ),
    assessmentDate: optionalDateOnlySchema,
    participants: z.preprocess(
      trimOptionalString,
      z.string().max(1000, "Participants must be 1000 characters or fewer.").optional(),
    ),
    method: z.preprocess(
      trimOptionalString,
      z.string().max(500, "Method must be 500 characters or fewer.").optional(),
    ),
    notes: z.preprocess(
      trimOptionalString,
      z.string().max(4000, "Notes must be 4000 characters or fewer.").optional(),
    ),
  })
  .strict();

export const saveAssessmentRiskEntryOutputSchema = z.object({
  assessmentId: z.string().min(1),
  riskEntryId: z.string().min(1),
  hazard: z.string().min(1),
  healthEffects: z.string().nullable(),
  whoAtRisk: z.string().nullable(),
  likelihood: z.number().int().positive().nullable(),
  consequence: z.number().int().positive().nullable(),
  riskLevel: z.enum(["low", "medium", "high"]).nullable(),
  classificationReasoning: z.string().nullable(),
  currentControls: z.string().nullable(),
  costEstimate: z.number().int().nonnegative().nullable(),
});

export const savedAssessmentRiskMitigationActionOutputSchema = z.object({
  assessmentId: z.string().min(1),
  mitigationActionId: z.string().min(1),
  riskEntryId: z.string().min(1),
  description: z.string().min(1),
  assigneeName: z.string().nullable(),
  dueDate: z
    .string()
    .refine(isDateOnlyValue, "Date must use YYYY-MM-DD format.")
    .nullable(),
  status: riskMitigationActionStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const deleteAssessmentRiskMitigationActionOutputSchema = z.object({
  assessmentId: z.string().min(1),
  riskEntryId: z.string().min(1),
  mitigationActionId: z.string().min(1),
});

export const saveAssessmentSummaryOutputSchema = z.object({
  assessmentId: z.string().min(1),
  companyName: z.string().nullable(),
  location: z.string().nullable(),
  assessmentDate: z
    .string()
    .refine(isDateOnlyValue, "Date must use YYYY-MM-DD format.")
    .nullable(),
  participants: z.string().nullable(),
  method: z.string().nullable(),
  notes: z.string().nullable(),
  readiness: assessmentExportReadinessSchema,
});

export const transferAssessmentFindingsToRiskRegisterInputSchema = z.object({
  assessmentId: z.preprocess(
    trimString,
    z.string().min(1, "Assessment id is required.").max(200),
  ),
});

export const transferAssessmentFindingsToRiskRegisterOutputSchema = z.object({
  assessmentId: z.string().min(1),
  eligibleFindingCount: z.number().int().nonnegative(),
  createdRiskEntryCount: z.number().int().nonnegative(),
  existingRiskEntryCount: z.number().int().nonnegative(),
});

export const generateAssessmentExportBundleInputSchema = z
  .object({
    assessmentId: z.preprocess(
      trimString,
      z.string().min(1, "Assessment id is required.").max(200),
    ),
  })
  .strict();

export const assessmentExportBundleFileSchema = z.object({
  kind: z.enum(["checklist", "register", "summary"]),
  format: z.enum(["docx", "pdf"]),
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1).max(200),
  sizeBytes: z.number().int().nonnegative(),
});

export const generateAssessmentExportBundleOutputSchema = z.object({
  assessmentId: z.string().min(1),
  fileName: z.string().min(1).max(300),
  contentType: z.literal("application/zip"),
  payloadBase64: z.string().min(1),
  files: z.array(assessmentExportBundleFileSchema).length(6),
});

export type WorkplaceArchetype = z.infer<typeof workplaceArchetypeSchema>;
export type AssessmentWalkthroughStatus = z.infer<
  typeof assessmentWalkthroughStatusSchema
>;
export type SaveAssessmentCriterionStatus = z.infer<
  typeof saveAssessmentCriterionStatusSchema
>;
export type StartAssessmentFromSeededTemplateInput = z.infer<
  typeof startAssessmentFromSeededTemplateInputSchema
>;
export type StartAssessmentFromSeededTemplateOutput = z.infer<
  typeof startAssessmentFromSeededTemplateOutputSchema
>;
export type SaveAssessmentCriterionResponseInput = z.infer<
  typeof saveAssessmentCriterionResponseInputSchema
>;
export type SaveAssessmentCriterionResponseOutput = z.infer<
  typeof saveAssessmentCriterionResponseOutputSchema
>;
export type SaveAssessmentRiskEntryInput = z.infer<
  typeof saveAssessmentRiskEntryInputSchema
>;
export type RiskMitigationActionStatus = z.infer<
  typeof riskMitigationActionStatusSchema
>;
export type AssessmentSummaryRequiredField = z.infer<
  typeof assessmentSummaryRequiredFieldSchema
>;
export type AssessmentExportReadiness = z.infer<
  typeof assessmentExportReadinessSchema
>;
export type SaveAssessmentSummaryInput = z.infer<
  typeof saveAssessmentSummaryInputSchema
>;
export type CreateAssessmentRiskMitigationActionInput = z.infer<
  typeof createAssessmentRiskMitigationActionInputSchema
>;
export type UpdateAssessmentRiskMitigationActionInput = z.infer<
  typeof updateAssessmentRiskMitigationActionInputSchema
>;
export type DeleteAssessmentRiskMitigationActionInput = z.infer<
  typeof deleteAssessmentRiskMitigationActionInputSchema
>;
export type SaveAssessmentRiskEntryOutput = z.infer<
  typeof saveAssessmentRiskEntryOutputSchema
>;
export type SavedAssessmentRiskMitigationActionOutput = z.infer<
  typeof savedAssessmentRiskMitigationActionOutputSchema
>;
export type DeleteAssessmentRiskMitigationActionOutput = z.infer<
  typeof deleteAssessmentRiskMitigationActionOutputSchema
>;
export type SaveAssessmentSummaryOutput = z.infer<
  typeof saveAssessmentSummaryOutputSchema
>;
export type TransferAssessmentFindingsToRiskRegisterInput = z.infer<
  typeof transferAssessmentFindingsToRiskRegisterInputSchema
>;
export type TransferAssessmentFindingsToRiskRegisterOutput = z.infer<
  typeof transferAssessmentFindingsToRiskRegisterOutputSchema
>;
export type GenerateAssessmentExportBundleInput = z.infer<
  typeof generateAssessmentExportBundleInputSchema
>;
export type AssessmentExportBundleFile = z.infer<
  typeof assessmentExportBundleFileSchema
>;
export type GenerateAssessmentExportBundleOutput = z.infer<
  typeof generateAssessmentExportBundleOutputSchema
>;
