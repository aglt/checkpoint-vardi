"use server";

import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

import {
  saveAssessmentRiskEntry,
  type SaveAssessmentRiskEntryParams,
} from "./saveAssessmentRiskEntry";

export async function saveAssessmentRiskEntryAction(
  params: Omit<SaveAssessmentRiskEntryParams, "db" | "ownerId">,
) {
  return saveAssessmentRiskEntry({
    ...params,
    db: getDatabase(),
    ownerId: getCurrentUser().id,
  });
}
