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

export type WorkplaceArchetype = z.infer<typeof workplaceArchetypeSchema>;
export type StartAssessmentFromSeededTemplateInput = z.infer<
  typeof startAssessmentFromSeededTemplateInputSchema
>;
export type StartAssessmentFromSeededTemplateOutput = z.infer<
  typeof startAssessmentFromSeededTemplateOutputSchema
>;
