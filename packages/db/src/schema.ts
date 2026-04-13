import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const workplaceArchetypes = ["fixed", "mobile", "construction"] as const;
export const assessmentStatuses = ["draft", "completed"] as const;
export const findingStatuses = ["ok", "notOk", "notApplicable", "unanswered"] as const;
export const walkthroughAttentionSeverities = ["small", "medium", "large"] as const;
export const riskLevels = ["low", "medium", "high"] as const;
export const riskMitigationActionStatuses = ["open", "inProgress", "done"] as const;
export const controlHierarchies = [
  "eliminate",
  "substitute",
  "engineering",
  "administrative",
  "ppe",
] as const;

export const workplace = sqliteTable(
  "workplace",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    archetype: text("archetype", { enum: workplaceArchetypes }).notNull(),
    primaryLanguage: text("primary_language").notNull().default("is"),
  },
  (table) => ({
    ownerIdx: index("workplace_owner_idx").on(table.ownerId),
  }),
);

export const riskAssessment = sqliteTable(
  "risk_assessment",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    workplaceId: text("workplace_id")
      .notNull()
      .references(() => workplace.id, { onDelete: "cascade" }),
    checklistId: text("checklist_id").notNull(),
    checklistSlug: text("checklist_slug").notNull(),
    checklistVersion: text("checklist_version").notNull(),
    riskMatrixId: text("risk_matrix_id").notNull(),
    status: text("status", { enum: assessmentStatuses }).notNull().default("draft"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => ({
    ownerIdx: index("risk_assessment_owner_idx").on(table.ownerId),
    workplaceIdx: index("risk_assessment_workplace_idx").on(table.workplaceId),
  }),
);

export const finding = sqliteTable(
  "finding",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => riskAssessment.id, { onDelete: "cascade" }),
    criterionId: text("criterion_id").notNull(),
    status: text("status", { enum: findingStatuses }).notNull().default("unanswered"),
    attentionSeverity: text("attention_severity", {
      enum: walkthroughAttentionSeverities,
    }),
    notes: text("notes"),
    voiceTranscript: text("voice_transcript"),
    notesLanguage: text("notes_language"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    ownerIdx: index("finding_owner_idx").on(table.ownerId),
    assessmentIdx: index("finding_assessment_idx").on(table.assessmentId),
    assessmentCriterionUnique: uniqueIndex("finding_assessment_criterion_unique").on(
      table.assessmentId,
      table.criterionId,
    ),
  }),
);

export const riskEntry = sqliteTable(
  "risk_entry",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    findingId: text("finding_id")
      .notNull()
      .references(() => finding.id, { onDelete: "cascade" }),
    hazard: text("hazard"),
    healthEffects: text("health_effects"),
    whoAtRisk: text("who_at_risk"),
    likelihood: integer("likelihood"),
    consequence: integer("consequence"),
    riskLevel: text("risk_level", { enum: riskLevels }),
    // Classification-only reasoning for the saved risk score. Future mitigation
    // or reviewer notes need their own owned fields instead of widening this one.
    classificationReasoning: text("classification_reasoning"),
    currentControls: text("current_controls"),
    controlHierarchy: text("control_hierarchy", { enum: controlHierarchies }),
    costEstimate: integer("cost_estimate"),
  },
  (table) => ({
    ownerIdx: index("risk_entry_owner_idx").on(table.ownerId),
    findingUnique: uniqueIndex("risk_entry_finding_unique").on(table.findingId),
  }),
);

export const riskMitigationAction = sqliteTable(
  "risk_mitigation_action",
  {
    id: text("id").primaryKey(),
    riskEntryId: text("risk_entry_id")
      .notNull()
      .references(() => riskEntry.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    description: text("description").notNull(),
    assigneeName: text("assignee_name"),
    dueDate: integer("due_date", { mode: "timestamp_ms" }),
    status: text("status", { enum: riskMitigationActionStatuses }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    ownerIdx: index("risk_mitigation_action_owner_idx").on(table.ownerId),
    riskEntryIdx: index("risk_mitigation_action_risk_entry_idx").on(table.riskEntryId),
  }),
);

export const assessmentSummary = sqliteTable(
  "summary",
  {
    assessmentId: text("assessment_id")
      .primaryKey()
      .references(() => riskAssessment.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    companyName: text("company_name"),
    location: text("location"),
    assessmentDate: integer("assessment_date", { mode: "timestamp_ms" }),
    participants: text("participants"),
    method: text("method"),
    notes: text("notes"),
  },
  (table) => ({
    ownerIdx: index("summary_owner_idx").on(table.ownerId),
  }),
);

export type WorkplaceRow = typeof workplace.$inferSelect;
export type RiskAssessmentRow = typeof riskAssessment.$inferSelect;
export type FindingRow = typeof finding.$inferSelect;
export type RiskEntryRow = typeof riskEntry.$inferSelect;
export type RiskMitigationActionRow = typeof riskMitigationAction.$inferSelect;
export type AssessmentSummaryRow = typeof assessmentSummary.$inferSelect;
