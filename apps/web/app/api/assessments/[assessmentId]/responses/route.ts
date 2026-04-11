import { NextResponse } from "next/server";
import {
  saveAssessmentCriterionResponseInputSchema,
} from "@vardi/schemas";

import {
  SaveAssessmentCriterionResponseError,
  saveAssessmentCriterionResponse,
} from "@/lib/assessments/saveAssessmentCriterionResponse";

const ERROR_MESSAGES = {
  "invalid-walkthrough-save-request": "The walkthrough answer was incomplete.",
  "criterion-not-found": "The walkthrough item could not be found.",
  "walkthrough-save-unavailable": "Walkthrough save is temporarily unavailable.",
} as const;

type ErrorCode = keyof typeof ERROR_MESSAGES;

interface RouteContext {
  readonly params: Promise<{
    readonly assessmentId: string;
  }>;
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { assessmentId } = await context.params;
  const payload = await readJsonPayload(request);
  const parsedInput = saveAssessmentCriterionResponseInputSchema.safeParse(payload);

  if (!parsedInput.success) {
    return NextResponse.json(
      createErrorEnvelope(
        "invalid-walkthrough-save-request",
        toFieldErrors(parsedInput.error.flatten().fieldErrors),
      ),
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await saveAssessmentCriterionResponse({
        assessmentId,
        input: parsedInput.data,
      }),
    );
  } catch (error) {
    if (error instanceof SaveAssessmentCriterionResponseError) {
      return NextResponse.json(
        createErrorEnvelope(
          error.code as ErrorCode,
          error.fieldErrors,
          error.message,
        ),
        { status: error.status },
      );
    }

    return NextResponse.json(
      createErrorEnvelope(
        "walkthrough-save-unavailable",
        undefined,
        ERROR_MESSAGES["walkthrough-save-unavailable"],
      ),
      { status: 500 },
    );
  }
}

async function readJsonPayload(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function createErrorEnvelope(
  code: ErrorCode,
  fieldErrors?: Record<string, string[]>,
  message?: string,
) {
  return {
    error: {
      code,
      message: message ?? ERROR_MESSAGES[code],
      ...(fieldErrors ? { fieldErrors } : {}),
    },
  };
}

function toFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string[]> | undefined {
  const entries = Object.entries(fieldErrors).filter(
    (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0,
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
