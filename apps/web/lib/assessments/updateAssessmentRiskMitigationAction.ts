import {
  AssessmentAggregateNotFoundError,
  AssessmentRiskMitigationActionNotFoundError,
  updateAssessmentRiskMitigationAction as persistAssessmentRiskMitigationAction,
  type RiskMitigationActionRow,
  type VardiDatabase,
} from "@vardi/db";
import {
  savedAssessmentRiskMitigationActionOutputSchema,
  updateAssessmentRiskMitigationActionInputSchema,
  type SavedAssessmentRiskMitigationActionOutput,
  type UpdateAssessmentRiskMitigationActionInput,
} from "@vardi/schemas";

export interface UpdateAssessmentRiskMitigationActionParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly input: UpdateAssessmentRiskMitigationActionInput;
  readonly dependencies?: {
    readonly updateAssessmentRiskMitigationAction?: typeof persistAssessmentRiskMitigationAction;
  };
}

export class UpdateAssessmentRiskMitigationActionError extends Error {
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
    this.name = "UpdateAssessmentRiskMitigationActionError";
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors;
  }
}

export function updateAssessmentRiskMitigationAction(
  params: UpdateAssessmentRiskMitigationActionParams,
): SavedAssessmentRiskMitigationActionOutput {
  const parsedInput = updateAssessmentRiskMitigationActionInputSchema.safeParse(
    params.input,
  );

  if (!parsedInput.success) {
    const flattenedError = parsedInput.error.flatten();

    throw new UpdateAssessmentRiskMitigationActionError({
      status: 400,
      code: "invalid-risk-mitigation-action-update-request",
      message: "The mitigation action was incomplete or invalid.",
      fieldErrors: toFieldErrors(
        flattenedError.fieldErrors,
        flattenedError.formErrors,
      ),
    });
  }

  const updateAction =
    params.dependencies?.updateAssessmentRiskMitigationAction ??
    persistAssessmentRiskMitigationAction;

  try {
    const updatedAction = updateAction({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
      mitigationActionId: parsedInput.data.mitigationActionId,
      description: parsedInput.data.description,
      assigneeName: parsedInput.data.assigneeName ?? null,
      dueDate: parseDateOnly(parsedInput.data.dueDate),
      status: parsedInput.data.status,
    });

    return savedAssessmentRiskMitigationActionOutputSchema.parse(
      buildSavedMitigationActionOutput(params.assessmentId, updatedAction),
    );
  } catch (error) {
    if (error instanceof AssessmentAggregateNotFoundError) {
      throw new UpdateAssessmentRiskMitigationActionError({
        status: 404,
        code: "assessment-not-found",
        message: "The assessment could not be found.",
      });
    }

    if (error instanceof AssessmentRiskMitigationActionNotFoundError) {
      throw new UpdateAssessmentRiskMitigationActionError({
        status: 404,
        code: "risk-mitigation-action-not-found",
        message: "The mitigation action could not be found.",
      });
    }

    console.error("Unexpected mitigation-action update failure", {
      assessmentId: params.assessmentId,
      mitigationActionId: parsedInput.data.mitigationActionId,
      error,
    });

    throw new UpdateAssessmentRiskMitigationActionError({
      status: 500,
      code: "risk-mitigation-action-update-unavailable",
      message: "Mitigation action save is temporarily unavailable.",
    });
  }
}

function buildSavedMitigationActionOutput(
  assessmentId: string,
  mitigationAction: RiskMitigationActionRow,
): SavedAssessmentRiskMitigationActionOutput {
  return {
    assessmentId,
    mitigationActionId: mitigationAction.id,
    riskEntryId: mitigationAction.riskEntryId,
    description: mitigationAction.description,
    assigneeName: mitigationAction.assigneeName,
    dueDate: formatDateOnly(mitigationAction.dueDate),
    status: mitigationAction.status,
    createdAt: mitigationAction.createdAt.toISOString(),
    updatedAt: mitigationAction.updatedAt.toISOString(),
  };
}

function parseDateOnly(value: string | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function formatDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
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
