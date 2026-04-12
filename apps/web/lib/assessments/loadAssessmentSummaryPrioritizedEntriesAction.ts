"use server";

import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

import { loadAssessmentSummaryProjection } from "./loadAssessmentSummaryProjection";

export async function loadAssessmentSummaryPrioritizedEntriesAction(input: {
  readonly assessmentId: string;
}) {
  return loadAssessmentSummaryProjection({
    db: getDatabase(),
    ownerId: getCurrentUser().id,
    assessmentId: input.assessmentId,
  }).prioritizedEntries;
}
