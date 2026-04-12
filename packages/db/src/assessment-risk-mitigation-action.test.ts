import assert from "node:assert/strict";
import test from "node:test";

import { eq } from "drizzle-orm";

import { closeDatabase, createMigratedDatabase } from "./database.js";
import {
  createAssessmentRiskMitigationAction,
} from "./create-assessment-risk-mitigation-action.js";
import {
  deleteAssessmentRiskMitigationAction,
} from "./delete-assessment-risk-mitigation-action.js";
import { AssessmentAggregateNotFoundError } from "./load-assessment-aggregate.js";
import {
  AssessmentRiskMitigationActionNotFoundError,
  loadAssessmentRiskMitigationActionContext,
} from "./load-assessment-risk-mitigation-action-context.js";
import {
  updateAssessmentRiskMitigationAction,
} from "./update-assessment-risk-mitigation-action.js";
import {
  finding,
  riskAssessment,
  riskEntry,
  riskMitigationAction,
  workplace,
} from "./schema.js";
import { AssessmentRiskEntryNotFoundError } from "./update-assessment-risk-entry.js";

const startedAt = new Date("2026-04-12T09:00:00.000Z");
const createdAt = new Date("2026-04-12T09:05:00.000Z");
const laterAt = new Date("2026-04-12T09:10:00.000Z");
const dueDate = new Date("2026-04-20T00:00:00.000Z");

function seedRiskMitigationFixture() {
  const connection = createMigratedDatabase();

  connection.db.insert(workplace).values([
    {
      id: "workplace-owner-1",
      ownerId: "owner-1",
      name: "Workshop one",
      address: "Austurberg 1",
      archetype: "construction",
      primaryLanguage: "is",
    },
    {
      id: "workplace-owner-2",
      ownerId: "owner-2",
      name: "Workshop two",
      address: "Austurberg 2",
      archetype: "construction",
      primaryLanguage: "is",
    },
  ]).run();

  connection.db.insert(riskAssessment).values([
    {
      id: "assessment-owner-1-a",
      ownerId: "owner-1",
      workplaceId: "workplace-owner-1",
      checklistId: "checklist.woodworking-workshop",
      checklistSlug: "woodworking-workshop",
      checklistVersion: "2026-04-12",
      riskMatrixId: "risk-matrix.course-3x3",
      status: "draft",
      startedAt,
      completedAt: null,
    },
    {
      id: "assessment-owner-1-b",
      ownerId: "owner-1",
      workplaceId: "workplace-owner-1",
      checklistId: "checklist.construction-site",
      checklistSlug: "construction-site",
      checklistVersion: "2026-04-12",
      riskMatrixId: "risk-matrix.course-3x3",
      status: "draft",
      startedAt,
      completedAt: null,
    },
    {
      id: "assessment-owner-2",
      ownerId: "owner-2",
      workplaceId: "workplace-owner-2",
      checklistId: "checklist.woodworking-workshop",
      checklistSlug: "woodworking-workshop",
      checklistVersion: "2026-04-12",
      riskMatrixId: "risk-matrix.course-3x3",
      status: "draft",
      startedAt,
      completedAt: null,
    },
  ]).run();

  connection.db.insert(finding).values([
    {
      id: "finding-owner-1-a",
      ownerId: "owner-1",
      assessmentId: "assessment-owner-1-a",
      criterionId: "criterion-owner-1-a",
      status: "notOk",
      notes: "Missing guard",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "finding-owner-1-b",
      ownerId: "owner-1",
      assessmentId: "assessment-owner-1-b",
      criterionId: "criterion-owner-1-b",
      status: "notOk",
      notes: "Missing signage",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "finding-owner-2",
      ownerId: "owner-2",
      assessmentId: "assessment-owner-2",
      criterionId: "criterion-owner-2",
      status: "notOk",
      notes: "Different owner",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt,
      updatedAt: createdAt,
    },
  ]).run();

  connection.db.insert(riskEntry).values([
    {
      id: "risk-entry-owner-1-a",
      ownerId: "owner-1",
      findingId: "finding-owner-1-a",
      hazard: "Guarding on saw",
      healthEffects: null,
      whoAtRisk: null,
      likelihood: null,
      consequence: null,
      riskLevel: null,
      currentControls: null,
      controlHierarchy: null,
      costEstimate: null,
    },
    {
      id: "risk-entry-owner-1-b",
      ownerId: "owner-1",
      findingId: "finding-owner-1-b",
      hazard: "Safety signage",
      healthEffects: null,
      whoAtRisk: null,
      likelihood: null,
      consequence: null,
      riskLevel: null,
      currentControls: null,
      controlHierarchy: null,
      costEstimate: null,
    },
    {
      id: "risk-entry-owner-2",
      ownerId: "owner-2",
      findingId: "finding-owner-2",
      hazard: "Different owner hazard",
      healthEffects: null,
      whoAtRisk: null,
      likelihood: null,
      consequence: null,
      riskLevel: null,
      currentControls: null,
      controlHierarchy: null,
      costEstimate: null,
    },
  ]).run();

  connection.db.insert(riskMitigationAction).values([
    {
      id: "action-owner-1-a",
      riskEntryId: "risk-entry-owner-1-a",
      ownerId: "owner-1",
      description: "Install replacement guard",
      assigneeName: "Workshop lead",
      dueDate,
      status: "open",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "action-owner-2",
      riskEntryId: "risk-entry-owner-2",
      ownerId: "owner-2",
      description: "Different owner action",
      assigneeName: "Other owner",
      dueDate: null,
      status: "done",
      createdAt,
      updatedAt: createdAt,
    },
  ]).run();

  return connection;
}

test("createAssessmentRiskMitigationAction inserts an owner-scoped child action", () => {
  const connection = seedRiskMitigationFixture();

  const createdAction = createAssessmentRiskMitigationAction({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-owner-1-a",
    riskEntryId: "risk-entry-owner-1-a",
    description: "  Add lockout checklist  ",
    assigneeName: "  Shift supervisor  ",
    dueDate,
    status: "inProgress",
    createdAt: laterAt,
  });

  assert.equal(createdAction.riskEntryId, "risk-entry-owner-1-a");
  assert.equal(createdAction.ownerId, "owner-1");
  assert.equal(createdAction.description, "Add lockout checklist");
  assert.equal(createdAction.assigneeName, "Shift supervisor");
  assert.deepEqual(createdAction.dueDate, dueDate);
  assert.equal(createdAction.status, "inProgress");
  assert.deepEqual(createdAction.createdAt, laterAt);
  assert.deepEqual(createdAction.updatedAt, laterAt);

  assert.throws(
    () =>
      createAssessmentRiskMitigationAction({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-owner-1-a",
        riskEntryId: "risk-entry-owner-1-b",
        description: "Out of scope",
        status: "open",
      }),
    (error: unknown) => error instanceof AssessmentRiskEntryNotFoundError,
  );

  closeDatabase(connection);
});

test("loadAssessmentRiskMitigationActionContext scopes a mitigation action through the assessment boundary", () => {
  const connection = seedRiskMitigationFixture();

  const context = loadAssessmentRiskMitigationActionContext({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-owner-1-a",
    mitigationActionId: "action-owner-1-a",
  });

  assert.equal(context.assessment.id, "assessment-owner-1-a");
  assert.equal(context.riskEntry.id, "risk-entry-owner-1-a");
  assert.equal(context.mitigationAction.id, "action-owner-1-a");

  assert.throws(
    () =>
      loadAssessmentRiskMitigationActionContext({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "missing-assessment",
        mitigationActionId: "action-owner-1-a",
      }),
    (error: unknown) => error instanceof AssessmentAggregateNotFoundError,
  );

  assert.throws(
    () =>
      loadAssessmentRiskMitigationActionContext({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-owner-1-a",
        mitigationActionId: "action-owner-2",
      }),
    (error: unknown) =>
      error instanceof AssessmentRiskMitigationActionNotFoundError,
  );

  closeDatabase(connection);
});

test("updateAssessmentRiskMitigationAction edits only the scoped child row and normalizes cleared optional values", () => {
  const connection = seedRiskMitigationFixture();

  const updatedAction = updateAssessmentRiskMitigationAction({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-owner-1-a",
    mitigationActionId: "action-owner-1-a",
    description: "  Replace the blade guard immediately  ",
    assigneeName: "   ",
    dueDate: null,
    status: "done",
    updatedAt: laterAt,
  });

  assert.equal(updatedAction.description, "Replace the blade guard immediately");
  assert.equal(updatedAction.assigneeName, null);
  assert.equal(updatedAction.dueDate, null);
  assert.equal(updatedAction.status, "done");
  assert.deepEqual(updatedAction.updatedAt, laterAt);

  const untouchedAction = connection.db
    .select()
    .from(riskMitigationAction)
    .where(eq(riskMitigationAction.id, "action-owner-2"))
    .get();

  assert.equal(untouchedAction?.description, "Different owner action");

  closeDatabase(connection);
});

test("deleteAssessmentRiskMitigationAction removes only the scoped child row", () => {
  const connection = seedRiskMitigationFixture();

  const deletedContext = deleteAssessmentRiskMitigationAction({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-owner-1-a",
    mitigationActionId: "action-owner-1-a",
  });

  assert.equal(deletedContext.mitigationAction.id, "action-owner-1-a");
  assert.equal(deletedContext.riskEntry.id, "risk-entry-owner-1-a");

  const deletedAction = connection.db
    .select()
    .from(riskMitigationAction)
    .where(eq(riskMitigationAction.id, "action-owner-1-a"))
    .get();

  const survivingAction = connection.db
    .select()
    .from(riskMitigationAction)
    .where(eq(riskMitigationAction.id, "action-owner-2"))
    .get();

  assert.equal(deletedAction, undefined);
  assert.equal(survivingAction?.id, "action-owner-2");

  closeDatabase(connection);
});
