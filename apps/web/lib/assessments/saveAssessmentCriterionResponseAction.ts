"use server";

import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

import {
  saveAssessmentCriterionResponse,
  type SaveAssessmentCriterionResponseParams,
} from "./saveAssessmentCriterionResponse";

export async function saveAssessmentCriterionResponseAction(
  params: Omit<SaveAssessmentCriterionResponseParams, "db" | "ownerId">,
) {
  return saveAssessmentCriterionResponse({
    ...params,
    db: getDatabase(),
    ownerId: getCurrentUser().id,
  });
}
