import {
  AssessmentFindingResponseNotFoundError,
  type VardiDatabase,
  updateAssessmentFindingResponse,
} from "@vardi/db";
import {
  saveAssessmentCriterionResponseInputSchema,
  saveAssessmentCriterionResponseOutputSchema,
  type SaveAssessmentCriterionResponseInput,
  type SaveAssessmentCriterionResponseOutput,
} from "@vardi/schemas";

export interface SaveAssessmentCriterionResponseParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly input: SaveAssessmentCriterionResponseInput;
  readonly notesLanguage?: string | null;
}

export class SaveAssessmentCriterionResponseError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(params: {
    readonly status: number;
    readonly code: string;
    readonly message: string;
    readonly fieldErrors?: Record<string, string[]>;
  }) {
    super(params.message);
    this.name = "SaveAssessmentCriterionResponseError";
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors;
  }
}

export function saveAssessmentCriterionResponse(
  params: SaveAssessmentCriterionResponseParams,
): SaveAssessmentCriterionResponseOutput {
  const parsedInput = saveAssessmentCriterionResponseInputSchema.safeParse(
    params.input,
  );

  if (!parsedInput.success) {
    throw new SaveAssessmentCriterionResponseError({
      status: 400,
      code: "invalid-walkthrough-save-request",
      message: "The walkthrough answer was incomplete.",
      fieldErrors: toFieldErrors(parsedInput.error.flatten().fieldErrors),
    });
  }

  try {
    const updatedFinding = updateAssessmentFindingResponse({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
      criterionId: parsedInput.data.criterionId,
      status: parsedInput.data.status,
      attentionSeverity: parsedInput.data.attentionSeverity ?? null,
      notes: parsedInput.data.notes ?? null,
      notesLanguage: params.notesLanguage,
    });

    return saveAssessmentCriterionResponseOutputSchema.parse({
      assessmentId: params.assessmentId,
      criterionId: updatedFinding.criterionId,
      status: updatedFinding.status,
      attentionSeverity: updatedFinding.attentionSeverity,
      notes: updatedFinding.notes,
      updatedAt: updatedFinding.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof AssessmentFindingResponseNotFoundError) {
      throw new SaveAssessmentCriterionResponseError({
        status: 404,
        code: "criterion-not-found",
        message: "The walkthrough item could not be found.",
      });
    }

    console.error("Unexpected walkthrough save failure", {
      assessmentId: params.assessmentId,
      criterionId: parsedInput.data.criterionId,
      error,
    });

    throw new SaveAssessmentCriterionResponseError({
      status: 500,
      code: "walkthrough-save-unavailable",
      message: "Walkthrough save is temporarily unavailable.",
    });
  }
}

function toFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string[]> | undefined {
  const entries = Object.entries(fieldErrors).filter(
    (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0,
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
