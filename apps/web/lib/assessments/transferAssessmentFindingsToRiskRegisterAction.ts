"use server";

import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

import { transferAssessmentFindingsToRiskRegister } from "./transferAssessmentFindingsToRiskRegister";

export async function transferAssessmentFindingsToRiskRegisterAction(input: {
  readonly assessmentId: string;
}) {
  return transferAssessmentFindingsToRiskRegister({
    db: getDatabase(),
    ownerId: getCurrentUser().id,
    input,
  });
}
