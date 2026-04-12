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
    currentControls: z.preprocess(
      trimOptionalString,
      z
        .string()
        .max(4000, "Current controls must be 4000 characters or fewer.")
        .optional(),
    ),
    proposedAction: z.preprocess(
      trimOptionalString,
      z
        .string()
        .max(4000, "Proposed action must be 4000 characters or fewer.")
        .optional(),
    ),
    costEstimate: z.preprocess(
      normalizeOptionalInteger,
      z.number().int().nonnegative().optional(),
    ),
    responsibleOwner: z.preprocess(
      trimOptionalString,
      z.string().max(200, "Responsible owner must be 200 characters or fewer.").optional(),
    ),
    dueDate: optionalDateOnlySchema,
    completedAt: optionalDateOnlySchema,
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
  currentControls: z.string().nullable(),
  proposedAction: z.string().nullable(),
  costEstimate: z.number().int().nonnegative().nullable(),
  responsibleOwner: z.string().nullable(),
  dueDate: z
    .string()
    .refine(isDateOnlyValue, "Date must use YYYY-MM-DD format.")
    .nullable(),
  completedAt: z
    .string()
    .refine(isDateOnlyValue, "Date must use YYYY-MM-DD format.")
    .nullable(),
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
export type SaveAssessmentRiskEntryOutput = z.infer<
  typeof saveAssessmentRiskEntryOutputSchema
>;
export type TransferAssessmentFindingsToRiskRegisterInput = z.infer<
  typeof transferAssessmentFindingsToRiskRegisterInputSchema
>;
export type TransferAssessmentFindingsToRiskRegisterOutput = z.infer<
  typeof transferAssessmentFindingsToRiskRegisterOutputSchema
>;
