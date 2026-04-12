"use server";

import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

import {
  updateAssessmentRiskMitigationAction,
  type UpdateAssessmentRiskMitigationActionParams,
} from "./updateAssessmentRiskMitigationAction";

export async function updateAssessmentRiskMitigationActionAction(
  params: Omit<UpdateAssessmentRiskMitigationActionParams, "db" | "ownerId">,
) {
  return updateAssessmentRiskMitigationAction({
    ...params,
    db: getDatabase(),
    ownerId: getCurrentUser().id,
  });
}
