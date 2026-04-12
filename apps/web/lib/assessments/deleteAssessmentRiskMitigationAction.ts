import {
  AssessmentAggregateNotFoundError,
  AssessmentRiskMitigationActionNotFoundError,
  deleteAssessmentRiskMitigationAction as removeAssessmentRiskMitigationAction,
  type VardiDatabase,
} from "@vardi/db";
import {
  deleteAssessmentRiskMitigationActionInputSchema,
  deleteAssessmentRiskMitigationActionOutputSchema,
  type DeleteAssessmentRiskMitigationActionInput,
  type DeleteAssessmentRiskMitigationActionOutput,
} from "@vardi/schemas";

export interface DeleteAssessmentRiskMitigationActionParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly input: DeleteAssessmentRiskMitigationActionInput;
  readonly dependencies?: {
    readonly deleteAssessmentRiskMitigationAction?: typeof removeAssessmentRiskMitigationAction;
  };
}

export class DeleteAssessmentRiskMitigationActionError extends Error {
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
    this.name = "DeleteAssessmentRiskMitigationActionError";
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors;
  }
}

export function deleteAssessmentRiskMitigationAction(
  params: DeleteAssessmentRiskMitigationActionParams,
): DeleteAssessmentRiskMitigationActionOutput {
  const parsedInput = deleteAssessmentRiskMitigationActionInputSchema.safeParse(
    params.input,
  );

  if (!parsedInput.success) {
    const flattenedError = parsedInput.error.flatten();

    throw new DeleteAssessmentRiskMitigationActionError({
      status: 400,
      code: "invalid-risk-mitigation-action-delete-request",
      message: "The mitigation action delete request was incomplete or invalid.",
      fieldErrors: toFieldErrors(
        flattenedError.fieldErrors,
        flattenedError.formErrors,
      ),
    });
  }

  const deleteAction =
    params.dependencies?.deleteAssessmentRiskMitigationAction ??
    removeAssessmentRiskMitigationAction;

  try {
    const deletedAction = deleteAction({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
      mitigationActionId: parsedInput.data.mitigationActionId,
    });

    return deleteAssessmentRiskMitigationActionOutputSchema.parse({
      assessmentId: params.assessmentId,
      riskEntryId: deletedAction.riskEntry.id,
      mitigationActionId: deletedAction.mitigationAction.id,
    });
  } catch (error) {
    if (error instanceof AssessmentAggregateNotFoundError) {
      throw new DeleteAssessmentRiskMitigationActionError({
        status: 404,
        code: "assessment-not-found",
        message: "The assessment could not be found.",
      });
    }

    if (error instanceof AssessmentRiskMitigationActionNotFoundError) {
      throw new DeleteAssessmentRiskMitigationActionError({
        status: 404,
        code: "risk-mitigation-action-not-found",
        message: "The mitigation action could not be found.",
      });
    }

    console.error("Unexpected mitigation-action delete failure", {
      assessmentId: params.assessmentId,
      mitigationActionId: parsedInput.data.mitigationActionId,
      error,
    });

    throw new DeleteAssessmentRiskMitigationActionError({
      status: 500,
      code: "risk-mitigation-action-delete-unavailable",
      message: "Mitigation action delete is temporarily unavailable.",
    });
  }
}

function toFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
  formErrors: string[],
): Record<string, string[]> | undefined {
  const entries = Object.entries(fieldErrors).filter(
    (entry): entry is [string, string[]] =>
      Array.isArray(entry[1]) && entry[1].length > 0,
  );

  if (formErrors.length > 0) {
    entries.push(["_form", formErrors]);
  }

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
