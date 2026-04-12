import assert from "node:assert/strict";
import test from "node:test";

import { closeDatabase, createMigratedDatabase } from "./database.js";
import { AssessmentAggregateNotFoundError } from "./load-assessment-aggregate.js";
import { loadAssessmentRiskEntryContext } from "./load-assessment-risk-entry-context.js";
import { finding, riskAssessment, riskEntry, workplace } from "./schema.js";
import { AssessmentRiskEntryNotFoundError } from "./update-assessment-risk-entry.js";

const startedAt = new Date("2026-04-12T09:00:00.000Z");
const createdAt = new Date("2026-04-12T09:05:00.000Z");

function seedRiskEntryContextFixture() {
  const connection = createMigratedDatabase();

  connection.db.insert(workplace).values({
    id: "workplace-1",
    ownerId: "owner-1",
    name: "Workshop",
    address: "Austurberg 1",
    archetype: "construction",
    primaryLanguage: "is",
  }).run();

  connection.db.insert(riskAssessment).values({
    id: "assessment-1",
    ownerId: "owner-1",
    workplaceId: "workplace-1",
    checklistId: "checklist.woodworking-workshop",
    checklistSlug: "woodworking-workshop",
    checklistVersion: "2026-04-12",
    riskMatrixId: "risk-matrix.course-3x3",
    status: "draft",
    startedAt,
    completedAt: null,
  }).run();

  connection.db.insert(finding).values({
    id: "finding-1",
    ownerId: "owner-1",
    assessmentId: "assessment-1",
    criterionId: "criterion-1",
    status: "notOk",
    notes: "Missing guard",
    voiceTranscript: null,
    notesLanguage: "is",
    createdAt,
    updatedAt: createdAt,
  }).run();

  connection.db.insert(riskEntry).values({
    id: "risk-entry-1",
    ownerId: "owner-1",
    findingId: "finding-1",
    hazard: "Table saw without guard",
    healthEffects: null,
    whoAtRisk: null,
    likelihood: null,
    consequence: null,
    riskLevel: null,
    currentControls: null,
    proposedAction: null,
    controlHierarchy: null,
    costEstimate: null,
    responsibleOwner: null,
    dueDate: null,
    completedAt: null,
  }).run();

  return connection;
}

test("loadAssessmentRiskEntryContext narrows to the target row and its pinned matrix id", () => {
  const connection = seedRiskEntryContextFixture();

  const context = loadAssessmentRiskEntryContext({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
    riskEntryId: "risk-entry-1",
  });

  assert.deepEqual(context.assessment, {
    id: "assessment-1",
    riskMatrixId: "risk-matrix.course-3x3",
  });
  assert.deepEqual(context.finding, {
    id: "finding-1",
    criterionId: "criterion-1",
  });
  assert.equal(context.riskEntry.id, "risk-entry-1");
  assert.equal(context.riskEntry.findingId, "finding-1");

  closeDatabase(connection);
});

test("loadAssessmentRiskEntryContext rejects missing assessments and out-of-scope rows", () => {
  const connection = seedRiskEntryContextFixture();

  assert.throws(
    () =>
      loadAssessmentRiskEntryContext({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "missing-assessment",
        riskEntryId: "risk-entry-1",
      }),
    (error: unknown) => error instanceof AssessmentAggregateNotFoundError,
  );

  assert.throws(
    () =>
      loadAssessmentRiskEntryContext({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-1",
        riskEntryId: "missing-risk-entry",
      }),
    (error: unknown) => error instanceof AssessmentRiskEntryNotFoundError,
  );

  closeDatabase(connection);
});
