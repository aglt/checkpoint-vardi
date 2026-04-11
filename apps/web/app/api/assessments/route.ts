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
  const requestMode = getRequestMode(request);
  const payload = await readRequestPayload(request);
  const parsedInput =
    startAssessmentFromSeededTemplateInputSchema.safeParse(payload);

  if (!parsedInput.success) {
    return respondWithError(request, requestMode, "invalid-start-request", 400);
  }

  try {
    const output = startAssessmentFromSeededTemplateOutputSchema.parse(
      startAssessmentFromSeededTemplate({
        db: getDatabase(),
        ownerId: getCurrentUser().id,
        input: parsedInput.data,
      }),
    );

    if (requestMode === "form") {
      return NextResponse.redirect(
        new URL(`/assessments/${output.assessmentId}`, request.url),
        { status: 303 },
      );
    }

    return NextResponse.json(output, { status: 201 });
  } catch (error) {
    if (error instanceof SeedChecklistNotFoundError) {
      return respondWithError(request, requestMode, "unknown-template", 400);
    }

    if (error instanceof SeedRiskMatrixNotFoundError) {
      return respondWithError(request, requestMode, "start-unavailable", 500);
    }

    throw error;
  }
}

function getRequestMode(request: Request): "form" | "json" {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.startsWith("application/json") ? "json" : "form";
}

async function readRequestPayload(request: Request): Promise<unknown> {
  const requestMode = getRequestMode(request);

  if (requestMode === "json") {
    return request.json();
  }

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

function respondWithError(
  request: Request,
  requestMode: "form" | "json",
  errorCode: FormErrorCode,
  status: number,
): Response {
  if (requestMode === "form") {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("error", errorCode);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  return NextResponse.json(
    { error: errorCode, message: FORM_ERROR_MESSAGES[errorCode] },
    { status },
  );
}
