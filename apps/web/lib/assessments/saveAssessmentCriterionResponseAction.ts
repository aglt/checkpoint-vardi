"use server";

import {
  saveAssessmentCriterionResponse,
  type SaveAssessmentCriterionResponseParams,
} from "./saveAssessmentCriterionResponse";

export async function saveAssessmentCriterionResponseAction(
  params: SaveAssessmentCriterionResponseParams,
) {
  return saveAssessmentCriterionResponse(params);
}
