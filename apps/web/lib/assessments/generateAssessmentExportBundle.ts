import {
  AssessmentAggregateNotFoundError,
  type VardiDatabase,
} from "@vardi/db";
import {
  renderAssessmentReportBundle,
  type RenderAssessmentReportBundleResult,
} from "@vardi/export";
import {
  generateAssessmentExportBundleInputSchema,
  generateAssessmentExportBundleOutputSchema,
  type AssessmentExportReadiness,
  type GenerateAssessmentExportBundleInput,
  type GenerateAssessmentExportBundleOutput,
} from "@vardi/schemas";

import {
  AssessmentExportDocumentIntegrityError,
  buildAssessmentExportDocuments,
  type BuildAssessmentExportDocumentsParams,
} from "./buildAssessmentExportDocuments";
import {
  AssessmentReadModelIntegrityError,
  loadAssessmentReadModel,
} from "./loadAssessmentReadModel";
import {
  loadAssessmentRiskRegisterProjection,
  type LoadAssessmentRiskRegisterProjectionParams,
} from "./loadAssessmentRiskRegisterProjection";
import {
  loadAssessmentSummaryProjection,
  type LoadAssessmentSummaryProjectionParams,
} from "./loadAssessmentSummaryProjection";

export interface GenerateAssessmentExportBundleParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly input: GenerateAssessmentExportBundleInput;
  readonly dependencies?: {
    readonly loadAssessmentReadModel?: typeof loadAssessmentReadModel;
    readonly loadAssessmentRiskRegisterProjection?: (
      params: LoadAssessmentRiskRegisterProjectionParams,
    ) => ReturnType<typeof loadAssessmentRiskRegisterProjection>;
    readonly loadAssessmentSummaryProjection?: (
      params: LoadAssessmentSummaryProjectionParams,
    ) => ReturnType<typeof loadAssessmentSummaryProjection>;
    readonly buildAssessmentExportDocuments?: (
      params: BuildAssessmentExportDocumentsParams,
    ) => ReturnType<typeof buildAssessmentExportDocuments>;
    readonly renderAssessmentReportBundle?: (
      params: {
        readonly assessmentId: string;
        readonly documents: ReturnType<typeof buildAssessmentExportDocuments>;
      },
    ) => Promise<RenderAssessmentReportBundleResult>;
  };
}

export class GenerateAssessmentExportBundleError extends Error {
  readonly status: number;
  readonly code: string;
  readonly readiness?: AssessmentExportReadiness;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(params: {
    readonly status: number;
    readonly code: string;
    readonly message: string;
    readonly readiness?: AssessmentExportReadiness;
    readonly fieldErrors?: Record<string, string[]>;
  }) {
    super(params.message);
    this.name = "GenerateAssessmentExportBundleError";
    this.status = params.status;
    this.code = params.code;
    this.readiness = params.readiness;
    this.fieldErrors = params.fieldErrors;
  }
}

export async function generateAssessmentExportBundle(
  params: GenerateAssessmentExportBundleParams,
): Promise<GenerateAssessmentExportBundleOutput> {
  const parsedInput = generateAssessmentExportBundleInputSchema.safeParse(
    params.input,
  );

  if (!parsedInput.success) {
    const flattenedError = parsedInput.error.flatten();

    throw new GenerateAssessmentExportBundleError({
      status: 400,
      code: "invalid-assessment-export-request",
      message: "The assessment export request was incomplete or invalid.",
      fieldErrors: toFieldErrors(
        flattenedError.fieldErrors,
        flattenedError.formErrors,
      ),
    });
  }

  const resolveAssessmentReadModel =
    params.dependencies?.loadAssessmentReadModel ?? loadAssessmentReadModel;
  const resolveRiskRegisterProjection =
    params.dependencies?.loadAssessmentRiskRegisterProjection ??
    loadAssessmentRiskRegisterProjection;
  const resolveSummaryProjection =
    params.dependencies?.loadAssessmentSummaryProjection ??
    loadAssessmentSummaryProjection;
  const createAssessmentExportDocuments =
    params.dependencies?.buildAssessmentExportDocuments ??
    buildAssessmentExportDocuments;
  const renderExportBundle =
    params.dependencies?.renderAssessmentReportBundle ??
    renderAssessmentReportBundle;

  try {
    const readModel = resolveAssessmentReadModel({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: parsedInput.data.assessmentId,
    });
    const riskRegisterProjection = resolveRiskRegisterProjection({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: parsedInput.data.assessmentId,
      readModel,
    });
    const summaryProjection = resolveSummaryProjection({
      db: params.db,
      ownerId: params.ownerId,
      assessmentId: parsedInput.data.assessmentId,
      riskRegisterProjection,
    });

    if (!summaryProjection.readiness.exportReady) {
      throw new GenerateAssessmentExportBundleError({
        status: 422,
        code: "assessment-export-not-ready",
        message: "This assessment is not ready for export.",
        readiness: summaryProjection.readiness,
      });
    }

    const documents = createAssessmentExportDocuments({
      readModel,
      riskRegisterProjection,
      summaryProjection,
    });
    const bundle = await renderExportBundle({
      assessmentId: parsedInput.data.assessmentId,
      documents,
    });

    return generateAssessmentExportBundleOutputSchema.parse({
      assessmentId: parsedInput.data.assessmentId,
      fileName: bundle.fileName,
      contentType: bundle.contentType,
      payloadBase64: Buffer.from(bundle.bytes).toString("base64"),
      files: bundle.files,
    });
  } catch (error) {
    if (error instanceof GenerateAssessmentExportBundleError) {
      throw error;
    }

    if (error instanceof AssessmentAggregateNotFoundError) {
      throw new GenerateAssessmentExportBundleError({
        status: 404,
        code: "assessment-not-found",
        message: "The assessment could not be found.",
      });
    }

    if (
      error instanceof AssessmentReadModelIntegrityError ||
      error instanceof AssessmentExportDocumentIntegrityError
    ) {
      console.error("Deterministic assessment export failure", {
        assessmentId: parsedInput.data.assessmentId,
        error,
      });

      throw new GenerateAssessmentExportBundleError({
        status: 500,
        code: "assessment-export-unavailable",
        message: "Assessment export is temporarily unavailable.",
      });
    }

    console.error("Unexpected assessment export failure", {
      assessmentId: parsedInput.data.assessmentId,
      error,
    });

    throw new GenerateAssessmentExportBundleError({
      status: 500,
      code: "assessment-export-unavailable",
      message: "Assessment export is temporarily unavailable.",
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
