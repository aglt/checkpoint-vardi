"use server";

import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

import { loadAssessmentProgressionProjection } from "./loadAssessmentProgressionProjection";

export async function loadAssessmentProgressionAction(input: {
  readonly assessmentId: string;
}) {
  return loadAssessmentProgressionProjection({
    db: getDatabase(),
    ownerId: getCurrentUser().id,
    assessmentId: input.assessmentId,
  });
}
