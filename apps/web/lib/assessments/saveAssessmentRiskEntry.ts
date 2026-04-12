import {
  AssessmentAggregateNotFoundError,
  AssessmentRiskEntryNotFoundError,
  type RiskEntryRow,
  updateAssessmentRiskEntry,
  type VardiDatabase,
} from "@vardi/db";
import {
  saveAssessmentRiskEntryInputSchema,
  saveAssessmentRiskEntryOutputSchema,
  type SaveAssessmentRiskEntryInput,
  type SaveAssessmentRiskEntryOutput,
} from "@vardi/schemas";
import {
  InvalidRiskScoreError,
  MissingRiskMatrixLookupError,
  classifyRisk,
} from "@vardi/risk";

import {
  AssessmentRiskEntrySaveContextIntegrityError,
  loadAssessmentRiskEntrySaveContext,
} from "./loadAssessmentRiskEntrySaveContext";

export interface SaveAssessmentRiskEntryParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly assessmentId: string;
  readonly input: SaveAssessmentRiskEntryInput;
  readonly dependencies?: {
    readonly loadAssessmentRiskEntrySaveContext?: typeof loadAssessmentRiskEntrySaveContext;
    readonly updateAssessmentRiskEntry?: typeof updateAssessmentRiskEntry;
    readonly classifyRisk?: typeof classifyRisk;
  };
}

export class SaveAssessmentRiskEntryError extends Error {
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
    this.name = "SaveAssessmentRiskEntryError";
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors;
  }
}

export function saveAssessmentRiskEntry(
  params: SaveAssessmentRiskEntryParams,
): SaveAssessmentRiskEntryOutput {
  const parsedInput = saveAssessmentRiskEntryInputSchema.safeParse(params.input);

  if (!parsedInput.success) {
    const flattenedError = parsedInput.error.flatten();

    throw new SaveAssessmentRiskEntryError({
      status: 400,
      code: "invalid-risk-entry-save-request",
      message: "The risk entry was incomplete or invalid.",
      fieldErrors: toFieldErrors(
        flattenedError.fieldErrors,
        flattenedError.formErrors,
      ),
    });
  }

  const loadRiskEntrySaveContext =
    params.dependencies?.loadAssessmentRiskEntrySaveContext ??
    loadAssessmentRiskEntrySaveContext;
  const persistRiskEntry =
    params.dependencies?.updateAssessmentRiskEntry ?? updateAssessmentRiskEntry;
  const classifyPersistedRisk =
    params.dependencies?.classifyRisk ?? classifyRisk;

  try {
    const saveContext = loadRiskEntrySaveContext({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
      riskEntryId: parsedInput.data.riskEntryId,
    });

    const updatedRiskEntry = persistRiskEntry({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: params.assessmentId,
      riskEntryId: parsedInput.data.riskEntryId,
      hazard: parsedInput.data.hazard,
      healthEffects: parsedInput.data.healthEffects ?? null,
      whoAtRisk: parsedInput.data.whoAtRisk ?? null,
      likelihood: parsedInput.data.likelihood ?? null,
      consequence: parsedInput.data.consequence ?? null,
      derivedRiskLevel: classifyPersistedRisk({
        matrix: {
          likelihoodLevels: saveContext.riskMatrix.likelihoodLevels,
          consequenceLevels: saveContext.riskMatrix.consequenceLevels,
          lookup: saveContext.riskMatrix.lookup,
        },
        likelihood: parsedInput.data.likelihood ?? null,
        consequence: parsedInput.data.consequence ?? null,
      }),
      currentControls: parsedInput.data.currentControls ?? null,
      proposedAction: parsedInput.data.proposedAction ?? null,
      costEstimate: parsedInput.data.costEstimate ?? null,
      responsibleOwner: parsedInput.data.responsibleOwner ?? null,
      dueDate: parseDateOnly(parsedInput.data.dueDate),
      completedAt: parseDateOnly(parsedInput.data.completedAt),
    });

    return saveAssessmentRiskEntryOutputSchema.parse(
      buildSaveAssessmentRiskEntryOutput(params.assessmentId, updatedRiskEntry),
    );
  } catch (error) {
    if (error instanceof AssessmentAggregateNotFoundError) {
      throw new SaveAssessmentRiskEntryError({
        status: 404,
        code: "assessment-not-found",
        message: "The assessment could not be found.",
      });
    }

    if (error instanceof AssessmentRiskEntryNotFoundError) {
      throw new SaveAssessmentRiskEntryError({
        status: 404,
        code: "risk-entry-not-found",
        message: "The risk entry could not be found.",
      });
    }

    if (
      error instanceof AssessmentRiskEntrySaveContextIntegrityError ||
      error instanceof InvalidRiskScoreError ||
      error instanceof MissingRiskMatrixLookupError
    ) {
      console.error("Deterministic risk-entry save failure", {
        assessmentId: params.assessmentId,
        riskEntryId: parsedInput.data.riskEntryId,
        error,
      });

      throw new SaveAssessmentRiskEntryError({
        status: 500,
        code: "risk-entry-save-unavailable",
        message: "Risk entry save is temporarily unavailable.",
      });
    }

    console.error("Unexpected risk-entry save failure", {
      assessmentId: params.assessmentId,
      riskEntryId: parsedInput.data.riskEntryId,
      error,
    });

    throw new SaveAssessmentRiskEntryError({
      status: 500,
      code: "risk-entry-save-unavailable",
      message: "Risk entry save is temporarily unavailable.",
    });
  }
}

function buildSaveAssessmentRiskEntryOutput(
  assessmentId: string,
  riskEntry: RiskEntryRow,
): SaveAssessmentRiskEntryOutput {
  return {
    assessmentId,
    riskEntryId: riskEntry.id,
    hazard: riskEntry.hazard ?? "",
    healthEffects: riskEntry.healthEffects,
    whoAtRisk: riskEntry.whoAtRisk,
    likelihood: riskEntry.likelihood,
    consequence: riskEntry.consequence,
    riskLevel: riskEntry.riskLevel,
    currentControls: riskEntry.currentControls,
    proposedAction: riskEntry.proposedAction,
    costEstimate: riskEntry.costEstimate,
    responsibleOwner: riskEntry.responsibleOwner,
    dueDate: formatDateOnly(riskEntry.dueDate),
    completedAt: formatDateOnly(riskEntry.completedAt),
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
    (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0,
  );

  if (formErrors.length > 0) {
    entries.push(["_form", formErrors]);
  }

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
