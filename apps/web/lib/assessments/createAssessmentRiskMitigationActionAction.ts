"use server";

import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

import {
  createAssessmentRiskMitigationAction,
  type CreateAssessmentRiskMitigationActionParams,
} from "./createAssessmentRiskMitigationAction";

export async function createAssessmentRiskMitigationActionAction(
  params: Omit<CreateAssessmentRiskMitigationActionParams, "db" | "ownerId">,
) {
  return createAssessmentRiskMitigationAction({
    ...params,
    db: getDatabase(),
    ownerId: getCurrentUser().id,
  });
}
