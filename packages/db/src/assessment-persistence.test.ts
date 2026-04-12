import assert from "node:assert/strict";
import test from "node:test";

import {
  applyMigrations,
  closeDatabase,
  createMigratedDatabase,
  openDatabase,
} from "./database.js";
import { AssessmentAggregateNotFoundError, loadAssessmentAggregate } from "./load-assessment-aggregate.js";
import {
  assessmentSummary,
  finding,
  riskAssessment,
  riskEntry,
  safetyPlan,
  workplace,
} from "./schema.js";

const baseStartedAt = new Date("2026-04-11T09:00:00.000Z");
const baseCreatedAt = new Date("2026-04-11T09:05:00.000Z");
const baseUpdatedAt = new Date("2026-04-11T09:10:00.000Z");

function seedAssessmentFixture(ownerId = "owner-1") {
  const connection = createMigratedDatabase();

  connection.db.insert(workplace).values({
    id: `workplace-${ownerId}`,
    ownerId,
    name: "Workshop",
    address: "Austurberg 1",
    archetype: "construction",
    primaryLanguage: "is",
  }).run();

  connection.db.insert(riskAssessment).values({
    id: `assessment-${ownerId}`,
    ownerId,
    workplaceId: `workplace-${ownerId}`,
    checklistId: "woodworking-workshop",
    checklistSlug: "woodworking-workshop",
    checklistVersion: "2026-04-11",
    riskMatrixId: "course-3x3",
    status: "draft",
    startedAt: baseStartedAt,
    completedAt: null,
  }).run();

  return connection;
}

test("migrations replay cleanly on a fresh SQLite database", () => {
  const connection = openDatabase();

  assert.doesNotThrow(() => applyMigrations(connection));
  assert.doesNotThrow(() => applyMigrations(connection));

  const tableNames = connection.sqlite
    .prepare("select name from sqlite_master where type = 'table' order by name")
    .all() as Array<{ name: string }>;

  assert.deepEqual(
    tableNames.map((row) => row.name),
    ["finding", "risk_assessment", "risk_entry", "safety_plan", "summary", "workplace"],
  );

  closeDatabase(connection);
});

test("safety plan rows attach to workplaces and cascade on workplace delete", () => {
  const connection = createMigratedDatabase();

  connection.db.insert(workplace).values({
    id: "workplace-1",
    ownerId: "owner-1",
    name: "Workshop",
    address: "Austurberg 1",
    archetype: "construction",
    primaryLanguage: "is",
  }).run();

  connection.db.insert(safetyPlan).values({
    id: "safety-plan-1",
    ownerId: "owner-1",
    workplaceId: "workplace-1",
    status: "active",
    createdAt: baseCreatedAt,
    reviewDueAt: new Date("2027-04-11T09:05:00.000Z"),
    reviewCadence: "yearly",
  }).run();

  assert.equal(connection.db.select().from(safetyPlan).all().length, 1);

  connection.db.delete(workplace).run();

  assert.equal(connection.db.select().from(safetyPlan).all().length, 0);

  closeDatabase(connection);
});

test("finding uniqueness is enforced on assessment and criterion", () => {
  const connection = seedAssessmentFixture();

  connection.db.insert(finding).values({
    id: "finding-1",
    ownerId: "owner-1",
    assessmentId: "assessment-owner-1",
    criterionId: "woodworking-workshop.section-01.criterion-01",
    status: "ok",
    notes: "first",
    voiceTranscript: null,
    notesLanguage: "is",
    createdAt: baseCreatedAt,
    updatedAt: baseUpdatedAt,
  }).run();

  assert.throws(
    () =>
      connection.db.insert(finding).values({
        id: "finding-2",
        ownerId: "owner-1",
        assessmentId: "assessment-owner-1",
        criterionId: "woodworking-workshop.section-01.criterion-01",
        status: "notOk",
        notes: "duplicate",
        voiceTranscript: null,
        notesLanguage: "is",
        createdAt: baseCreatedAt,
        updatedAt: baseUpdatedAt,
      }).run(),
  );

  closeDatabase(connection);
});

test("risk entry uniqueness is enforced on finding id", () => {
  const connection = seedAssessmentFixture();

  connection.db.insert(finding).values({
    id: "finding-1",
    ownerId: "owner-1",
    assessmentId: "assessment-owner-1",
    criterionId: "woodworking-workshop.section-01.criterion-01",
    status: "notOk",
    notes: "needs action",
    voiceTranscript: null,
    notesLanguage: "is",
    createdAt: baseCreatedAt,
    updatedAt: baseUpdatedAt,
  }).run();

  connection.db.insert(riskEntry).values({
    id: "risk-entry-1",
    ownerId: "owner-1",
    findingId: "finding-1",
    hazard: "Sharp blade",
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

  assert.throws(
    () =>
      connection.db.insert(riskEntry).values({
        id: "risk-entry-2",
        ownerId: "owner-1",
        findingId: "finding-1",
        hazard: "Duplicate",
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
      }).run(),
  );

  closeDatabase(connection);
});

test("summary uniqueness is enforced by assessment primary key", () => {
  const connection = seedAssessmentFixture();

  connection.db.insert(assessmentSummary).values({
    assessmentId: "assessment-owner-1",
    ownerId: "owner-1",
    companyName: "Checkpoint Vardi",
    location: "Reykjavik",
    assessmentDate: baseStartedAt,
    participants: "One assessor",
    method: "Walkthrough",
    notes: "First summary",
  }).run();

  assert.throws(
    () =>
      connection.db.insert(assessmentSummary).values({
        assessmentId: "assessment-owner-1",
        ownerId: "owner-1",
        companyName: "Duplicate",
        location: null,
        assessmentDate: null,
        participants: null,
        method: null,
        notes: null,
      }).run(),
  );

  closeDatabase(connection);
});

test("loadAssessmentAggregate returns the owner-scoped persisted graph", () => {
  const connection = seedAssessmentFixture();

  connection.db.insert(finding).values([
    {
      id: "finding-1",
      ownerId: "owner-1",
      assessmentId: "assessment-owner-1",
      criterionId: "woodworking-workshop.section-01.criterion-01",
      status: "notOk",
      notes: "Broken guard",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt: baseCreatedAt,
      updatedAt: baseUpdatedAt,
    },
    {
      id: "finding-2",
      ownerId: "owner-1",
      assessmentId: "assessment-owner-1",
      criterionId: "woodworking-workshop.section-01.criterion-02",
      status: "ok",
      notes: "Fine",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt: new Date("2026-04-11T09:15:00.000Z"),
      updatedAt: new Date("2026-04-11T09:20:00.000Z"),
    },
  ]).run();

  connection.db.insert(riskEntry).values({
    id: "risk-entry-1",
    ownerId: "owner-1",
    findingId: "finding-1",
    hazard: "Sharp edge",
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

  connection.db.insert(assessmentSummary).values({
    assessmentId: "assessment-owner-1",
    ownerId: "owner-1",
    companyName: "Checkpoint Vardi",
    location: "Workshop",
    assessmentDate: baseStartedAt,
    participants: "Assessor",
    method: "Walkthrough",
    notes: "Summary",
  }).run();

  const aggregate = loadAssessmentAggregate({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-owner-1",
  });

  assert.equal(aggregate.workplace.id, "workplace-owner-1");
  assert.equal(aggregate.assessment.id, "assessment-owner-1");
  assert.equal(aggregate.findings.length, 2);
  assert.equal(aggregate.riskEntries.length, 1);
  assert.equal(aggregate.summary?.assessmentId, "assessment-owner-1");

  assert.throws(
    () =>
      loadAssessmentAggregate({
        db: connection.db,
        ownerId: "owner-2",
        assessmentId: "assessment-owner-1",
      }),
    AssessmentAggregateNotFoundError,
  );

  closeDatabase(connection);
});
