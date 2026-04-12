// @vardi/db — typed assessment persistence queries and schema-owned read/write
// seams. Runtime/test SQLite bootstrap lives behind explicit subpath entrypoints.
export type { VardiDatabase } from "./connection.js";
export {
  AssessmentAggregateNotFoundError,
  loadAssessmentAggregate,
  type AssessmentAggregate,
  type LoadAssessmentAggregateParams,
} from "./load-assessment-aggregate.js";
export {
  loadAssessmentRiskMitigationActions,
  type LoadAssessmentRiskMitigationActionsParams,
} from "./load-assessment-risk-mitigation-actions.js";
export {
  loadAssessmentRiskEntryContext,
  type AssessmentRiskEntryContext,
  type LoadAssessmentRiskEntryContextParams,
} from "./load-assessment-risk-entry-context.js";
export {
  AssessmentRiskMitigationActionNotFoundError,
  loadAssessmentRiskMitigationActionContext,
  type AssessmentRiskMitigationActionContext,
  type LoadAssessmentRiskMitigationActionContextParams,
} from "./load-assessment-risk-mitigation-action-context.js";
export {
  createWorkplaceAssessment,
  EmptyAssessmentCriteriaError,
  type CreateWorkplaceAssessmentParams,
  type CreateWorkplaceAssessmentResult,
} from "./create-workplace-assessment.js";
export {
  createAssessmentRiskMitigationAction,
  type CreateAssessmentRiskMitigationActionParams,
} from "./create-assessment-risk-mitigation-action.js";
export {
  AssessmentFindingResponseNotFoundError,
  updateAssessmentFindingResponse,
  type UpdatableFindingStatus,
  type UpdateAssessmentFindingResponseParams,
} from "./update-assessment-finding-response.js";
export {
  AssessmentRiskEntryNotFoundError,
  updateAssessmentRiskEntry,
  type UpdateAssessmentRiskEntryParams,
} from "./update-assessment-risk-entry.js";
export {
  updateAssessmentRiskMitigationAction,
  type UpdateAssessmentRiskMitigationActionParams,
} from "./update-assessment-risk-mitigation-action.js";
export {
  deleteAssessmentRiskMitigationAction,
  type DeleteAssessmentRiskMitigationActionParams,
} from "./delete-assessment-risk-mitigation-action.js";
export {
  AssessmentSummaryNotFoundError,
  upsertAssessmentSummary,
  type UpsertAssessmentSummaryParams,
} from "./upsert-assessment-summary.js";
export {
  MissingRiskEntryHazardError,
  transferAssessmentFindingsToRiskRegister,
  type TransferAssessmentFindingsToRiskRegisterParams,
  type TransferAssessmentFindingsToRiskRegisterResult,
} from "./transfer-assessment-findings-to-risk-register.js";
export {
  assessmentStatuses,
  assessmentSummary,
  controlHierarchies,
  finding,
  findingStatuses,
  riskAssessment,
  riskEntry,
  riskMitigationAction,
  riskMitigationActionStatuses,
  riskLevels,
  workplace,
  workplaceArchetypes,
  type AssessmentSummaryRow,
  type FindingRow,
  type RiskAssessmentRow,
  type RiskEntryRow,
  type RiskMitigationActionRow,
  type WorkplaceRow,
} from "./schema.js";
