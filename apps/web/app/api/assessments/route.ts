import { NextResponse } from "next/server";
import {
  startAssessmentFromSeededTemplateInputSchema,
  startAssessmentFromSeededTemplateOutputSchema,
} from "@vardi/schemas";

import {
  SeedChecklistNotFoundError,
  SeedRiskMatrixNotFoundError,
  startAssessmentFromSeededTemplate,
} from "@/lib/assessments/startAssessmentFromSeededTemplate";
import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

const FORM_ERROR_MESSAGES = {
  "invalid-start-request": "The assessment start form was incomplete.",
  "unknown-template": "The selected seeded template is not available.",
  "start-unavailable": "Assessment start is temporarily unavailable.",
} as const;

type FormErrorCode = keyof typeof FORM_ERROR_MESSAGES;

export async function POST(request: Request): Promise<Response> {
  const payload = await readFormPayload(request);
  const parsedInput =
    startAssessmentFromSeededTemplateInputSchema.safeParse(payload);

  if (!parsedInput.success) {
    return redirectWithError(request, "invalid-start-request");
  }

  try {
    const output = startAssessmentFromSeededTemplateOutputSchema.parse(
      startAssessmentFromSeededTemplate({
        db: getDatabase(),
        ownerId: getCurrentUser().id,
        input: parsedInput.data,
      }),
    );

    return NextResponse.redirect(
      new URL(`/assessments/${output.assessmentId}`, request.url),
      { status: 303 },
    );
  } catch (error) {
    if (error instanceof SeedChecklistNotFoundError) {
      return redirectWithError(request, "unknown-template");
    }

    if (error instanceof SeedRiskMatrixNotFoundError) {
      return redirectWithError(request, "start-unavailable");
    }

    throw error;
  }
}

async function readFormPayload(request: Request): Promise<unknown> {
  const formData = await request.formData();

  return {
    workplaceName: getFormValue(formData, "workplaceName"),
    workplaceAddress: getFormValue(formData, "workplaceAddress"),
    workplaceArchetype: getFormValue(formData, "workplaceArchetype"),
    checklistId: getFormValue(formData, "checklistId"),
  };
}

function getFormValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function redirectWithError(request: Request, errorCode: FormErrorCode): Response {
  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("error", errorCode);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
