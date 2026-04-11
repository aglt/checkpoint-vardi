// @vardi/schemas — Zod contracts shared between UI and API route handlers.
// Implementation lands with its corresponding local user stories under user_stories/.
import { z } from "zod";

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function trimOptionalString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? undefined : trimmedValue;
}

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
  status: assessmentWalkthroughStatusSchema,
  notes: z.preprocess(
    trimOptionalString,
    z.string().max(4000, "Notes must be 4000 characters or fewer.").optional(),
  ),
});

export const saveAssessmentCriterionResponseOutputSchema = z.object({
  assessmentId: z.string().min(1),
  criterionId: z.string().min(1),
  status: assessmentWalkthroughStatusSchema,
  notes: z.string().nullable(),
  updatedAt: z.string().datetime(),
});

export type WorkplaceArchetype = z.infer<typeof workplaceArchetypeSchema>;
export type AssessmentWalkthroughStatus = z.infer<
  typeof assessmentWalkthroughStatusSchema
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
