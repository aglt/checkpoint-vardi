import {
  AssessmentSummaryNotFoundError,
  type VardiDatabase,
  upsertAssessmentSummary,
} from "@vardi/db";
import {
  saveAssessmentSummaryInputSchema,
  saveAssessmentSummaryOutputSchema,
  type SaveAssessmentSummaryInput,
  type SaveAssessmentSummaryOutput,
} from "@vardi/schemas";

import {
  loadAssessmentSummaryProjection,
  type LoadAssessmentSummaryProjectionParams,
} from "./loadAssessmentSummaryProjection";

export interface SaveAssessmentSummaryParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly input: SaveAssessmentSummaryInput;
  readonly dependencies?: {
    readonly upsertAssessmentSummary?: typeof upsertAssessmentSummary;
    readonly loadAssessmentSummaryProjection?: (
      params: LoadAssessmentSummaryProjectionParams,
    ) => ReturnType<typeof loadAssessmentSummaryProjection>;
  };
}

export class SaveAssessmentSummaryError extends Error {
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
    this.name = "SaveAssessmentSummaryError";
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors;
  }
}

export function saveAssessmentSummary(
  params: SaveAssessmentSummaryParams,
): SaveAssessmentSummaryOutput {
  const parsedInput = saveAssessmentSummaryInputSchema.safeParse(params.input);

  if (!parsedInput.success) {
    const flattenedError = parsedInput.error.flatten();

    throw new SaveAssessmentSummaryError({
      status: 400,
      code: "invalid-summary-save-request",
      message: "The summary was incomplete or invalid.",
      fieldErrors: toFieldErrors(
        flattenedError.fieldErrors,
        flattenedError.formErrors,
      ),
    });
  }

  const persistAssessmentSummary =
    params.dependencies?.upsertAssessmentSummary ?? upsertAssessmentSummary;
  const resolveAssessmentSummaryProjection =
    params.dependencies?.loadAssessmentSummaryProjection ??
    loadAssessmentSummaryProjection;

  try {
    const savedSummary = persistAssessmentSummary({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
      companyName: parsedInput.data.companyName ?? null,
      location: parsedInput.data.location ?? null,
      assessmentDate: parseDateOnly(parsedInput.data.assessmentDate),
      participants: parsedInput.data.participants ?? null,
      method: parsedInput.data.method ?? null,
      notes: parsedInput.data.notes ?? null,
    });
    const projection = resolveAssessmentSummaryProjection({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
    });

    return saveAssessmentSummaryOutputSchema.parse({
      assessmentId: params.assessmentId,
      companyName: savedSummary.companyName,
      location: savedSummary.location,
      assessmentDate: formatDateOnly(savedSummary.assessmentDate),
      participants: savedSummary.participants,
      method: savedSummary.method,
      notes: savedSummary.notes,
      readiness: projection.readiness,
    });
  } catch (error) {
    if (error instanceof AssessmentSummaryNotFoundError) {
      throw new SaveAssessmentSummaryError({
        status: 404,
        code: "assessment-not-found",
        message: "The assessment could not be found.",
      });
    }

    console.error("Unexpected summary save failure", {
      assessmentId: params.assessmentId,
      error,
    });

    throw new SaveAssessmentSummaryError({
      status: 500,
      code: "summary-save-unavailable",
      message: "Summary save is temporarily unavailable.",
    });
  }
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
    (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0,
  );

  if (formErrors.length > 0) {
    entries.push(["_form", formErrors]);
  }

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
