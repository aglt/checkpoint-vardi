import {
  AssessmentAggregateNotFoundError,
  MissingRiskEntryHazardError,
  transferAssessmentFindingsToRiskRegister as transferAssessmentFindingsToRiskRegisterInDatabase,
  type TransferAssessmentFindingsToRiskRegisterResult,
  type VardiDatabase,
} from "@vardi/db";
import {
  transferAssessmentFindingsToRiskRegisterInputSchema,
  transferAssessmentFindingsToRiskRegisterOutputSchema,
  type TransferAssessmentFindingsToRiskRegisterInput,
  type TransferAssessmentFindingsToRiskRegisterOutput,
} from "@vardi/schemas";

import {
  AssessmentReadModelIntegrityError,
  loadAssessmentReadModel,
  type AssessmentReadModel,
} from "./loadAssessmentReadModel";

export interface TransferAssessmentFindingsToRiskRegisterParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly input: TransferAssessmentFindingsToRiskRegisterInput;
  readonly dependencies?: {
    readonly loadAssessmentReadModel?: typeof loadAssessmentReadModel;
    readonly transferAssessmentFindingsToRiskRegister?: (
      params: {
        readonly db: VardiDatabase;
        readonly ownerId: string;
        readonly assessmentId: string;
        readonly hazardByCriterionId: Readonly<Record<string, string>>;
      },
    ) => TransferAssessmentFindingsToRiskRegisterResult;
  };
}

export class TransferAssessmentFindingsToRiskRegisterError extends Error {
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
    this.name = "TransferAssessmentFindingsToRiskRegisterError";
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors;
  }
}

export function transferAssessmentFindingsToRiskRegister(
  params: TransferAssessmentFindingsToRiskRegisterParams,
): TransferAssessmentFindingsToRiskRegisterOutput {
  const parsedInput = transferAssessmentFindingsToRiskRegisterInputSchema.safeParse(
    params.input,
  );

  if (!parsedInput.success) {
    throw new TransferAssessmentFindingsToRiskRegisterError({
      status: 400,
      code: "invalid-risk-transfer-request",
      message: "The risk transfer request was incomplete.",
      fieldErrors: toFieldErrors(parsedInput.error.flatten().fieldErrors),
    });
  }

  const loadReadModel =
    params.dependencies?.loadAssessmentReadModel ?? loadAssessmentReadModel;
  const transferFindings =
    params.dependencies?.transferAssessmentFindingsToRiskRegister ??
    transferAssessmentFindingsToRiskRegisterInDatabase;

  try {
    const readModel = loadReadModel({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: parsedInput.data.assessmentId,
    });
    const transferResult = transferFindings({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: parsedInput.data.assessmentId,
      hazardByCriterionId: buildRiskEntryHazardByCriterionId(readModel),
    });

    return transferAssessmentFindingsToRiskRegisterOutputSchema.parse(
      transferResult,
    );
  } catch (error) {
    if (error instanceof AssessmentAggregateNotFoundError) {
      throw new TransferAssessmentFindingsToRiskRegisterError({
        status: 404,
        code: "assessment-not-found",
        message: "The assessment could not be found.",
      });
    }

    if (
      error instanceof AssessmentReadModelIntegrityError ||
      error instanceof MissingRiskEntryHazardError
    ) {
      console.error("Deterministic risk transfer failure", {
        assessmentId: parsedInput.data.assessmentId,
        error,
      });

      throw new TransferAssessmentFindingsToRiskRegisterError({
        status: 500,
        code: "risk-transfer-unavailable",
        message: "Risk transfer is temporarily unavailable.",
      });
    }

    console.error("Unexpected risk transfer failure", {
      assessmentId: parsedInput.data.assessmentId,
      error,
    });

    throw new TransferAssessmentFindingsToRiskRegisterError({
      status: 500,
      code: "risk-transfer-unavailable",
      message: "Risk transfer is temporarily unavailable.",
    });
  }
}

function buildRiskEntryHazardByCriterionId(
  readModel: AssessmentReadModel,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    readModel.sections.flatMap((section) =>
      section.criteria
        .filter(
          (criterion) =>
            criterion.response.status === "notOk" &&
            criterion.response.attentionSeverity != null,
        )
        .map((criterion) => [criterion.id, criterion.translations.is.title] as const),
    ),
  );
}

function toFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string[]> | undefined {
  const entries = Object.entries(fieldErrors).filter(
    (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0,
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
