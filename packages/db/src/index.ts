// @vardi/db — Drizzle ORM schema, narrow migration helpers, and typed assessment persistence queries.
export {
  applyMigrations,
  closeDatabase,
  createDatabaseConnection,
  createMigratedDatabaseConnection,
  type DatabaseConnection,
  type VardiDatabase,
} from "./connection.js";
export {
  AssessmentAggregateNotFoundError,
  loadAssessmentAggregate,
  type AssessmentAggregate,
  type LoadAssessmentAggregateParams,
} from "./load-assessment-aggregate.js";
export {
  loadAssessmentRiskEntryContext,
  type AssessmentRiskEntryContext,
  type LoadAssessmentRiskEntryContextParams,
} from "./load-assessment-risk-entry-context.js";
export {
  createWorkplaceAssessment,
  EmptyAssessmentCriteriaError,
  type CreateWorkplaceAssessmentParams,
  type CreateWorkplaceAssessmentResult,
} from "./create-workplace-assessment.js";
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
  riskLevels,
  workplace,
  workplaceArchetypes,
  type AssessmentSummaryRow,
  type FindingRow,
  type RiskAssessmentRow,
  type RiskEntryRow,
  type WorkplaceRow,
} from "./schema.js";
