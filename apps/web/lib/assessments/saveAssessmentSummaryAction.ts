"use server";

import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

import {
  saveAssessmentSummary,
  type SaveAssessmentSummaryParams,
} from "./saveAssessmentSummary";

export async function saveAssessmentSummaryAction(
  params: Omit<SaveAssessmentSummaryParams, "db" | "ownerId">,
) {
  return saveAssessmentSummary({
    ...params,
    db: getDatabase(),
    ownerId: getCurrentUser().id,
  });
}
