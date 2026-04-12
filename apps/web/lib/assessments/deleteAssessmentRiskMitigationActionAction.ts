"use server";

import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

import {
  deleteAssessmentRiskMitigationAction,
  type DeleteAssessmentRiskMitigationActionParams,
} from "./deleteAssessmentRiskMitigationAction";

export async function deleteAssessmentRiskMitigationActionAction(
  params: Omit<DeleteAssessmentRiskMitigationActionParams, "db" | "ownerId">,
) {
  return deleteAssessmentRiskMitigationAction({
    ...params,
    db: getDatabase(),
    ownerId: getCurrentUser().id,
  });
}
