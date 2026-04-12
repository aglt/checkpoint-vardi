import {
  AssessmentAggregateNotFoundError,
  AssessmentRiskEntryNotFoundError,
  createAssessmentRiskMitigationAction as persistAssessmentRiskMitigationAction,
  type RiskMitigationActionRow,
  type VardiDatabase,
} from "@vardi/db";
import {
  createAssessmentRiskMitigationActionInputSchema,
  savedAssessmentRiskMitigationActionOutputSchema,
  type CreateAssessmentRiskMitigationActionInput,
  type SavedAssessmentRiskMitigationActionOutput,
} from "@vardi/schemas";

export interface CreateAssessmentRiskMitigationActionParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly input: CreateAssessmentRiskMitigationActionInput;
  readonly dependencies?: {
    readonly createAssessmentRiskMitigationAction?: typeof persistAssessmentRiskMitigationAction;
  };
}

export class CreateAssessmentRiskMitigationActionError extends Error {
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
    this.name = "CreateAssessmentRiskMitigationActionError";
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors;
  }
}

export function createAssessmentRiskMitigationAction(
  params: CreateAssessmentRiskMitigationActionParams,
): SavedAssessmentRiskMitigationActionOutput {
  const parsedInput = createAssessmentRiskMitigationActionInputSchema.safeParse(
    params.input,
  );

  if (!parsedInput.success) {
    const flattenedError = parsedInput.error.flatten();

    throw new CreateAssessmentRiskMitigationActionError({
      status: 400,
      code: "invalid-risk-mitigation-action-create-request",
      message: "The mitigation action was incomplete or invalid.",
      fieldErrors: toFieldErrors(
        flattenedError.fieldErrors,
        flattenedError.formErrors,
      ),
    });
  }

  const createAction =
    params.dependencies?.createAssessmentRiskMitigationAction ??
    persistAssessmentRiskMitigationAction;

  try {
    const createdAction = createAction({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
      riskEntryId: parsedInput.data.riskEntryId,
      description: parsedInput.data.description,
      assigneeName: parsedInput.data.assigneeName ?? null,
      dueDate: parseDateOnly(parsedInput.data.dueDate),
      status: parsedInput.data.status,
    });

    return savedAssessmentRiskMitigationActionOutputSchema.parse(
      buildSavedMitigationActionOutput(params.assessmentId, createdAction),
    );
  } catch (error) {
    if (error instanceof AssessmentAggregateNotFoundError) {
      throw new CreateAssessmentRiskMitigationActionError({
        status: 404,
        code: "assessment-not-found",
        message: "The assessment could not be found.",
      });
    }

    if (error instanceof AssessmentRiskEntryNotFoundError) {
      throw new CreateAssessmentRiskMitigationActionError({
        status: 404,
        code: "risk-entry-not-found",
        message: "The risk entry could not be found.",
      });
    }

    console.error("Unexpected mitigation-action create failure", {
      assessmentId: params.assessmentId,
      riskEntryId: parsedInput.data.riskEntryId,
      error,
    });

    throw new CreateAssessmentRiskMitigationActionError({
      status: 500,
      code: "risk-mitigation-action-create-unavailable",
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
