"use server";

import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

import {
  generateAssessmentExportBundle,
  type GenerateAssessmentExportBundleParams,
} from "./generateAssessmentExportBundle";

export async function generateAssessmentExportBundleAction(
  params: Omit<GenerateAssessmentExportBundleParams, "db" | "ownerId">,
) {
  return await generateAssessmentExportBundle({
    ...params,
    db: getDatabase(),
    ownerId: getCurrentUser().id,
  });
}
