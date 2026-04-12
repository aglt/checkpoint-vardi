import assert from "node:assert/strict";
import test from "node:test";

import { getRiskMatrixBySlug, getSeedChecklistBySlug } from "@vardi/checklists";
import {
  closeDatabase,
  createBootstrappedDatabase,
  finding,
  riskAssessment,
  riskEntry,
  riskMitigationAction,
  workplace,
} from "@vardi/db/testing";

import { loadAssessmentRiskRegisterProjection } from "./loadAssessmentRiskRegisterProjection";

const checklist = getRequiredChecklist();
const riskMatrix = getRequiredRiskMatrix();
const startedAt = new Date("2026-04-11T10:00:00.000Z");
const createdAt = new Date("2026-04-11T10:05:00.000Z");
const updatedAt = new Date("2026-04-11T10:06:00.000Z");

function getRequiredChecklist() {
  const seededChecklist = getSeedChecklistBySlug("woodworking-workshop");
  if (!seededChecklist) {
    throw new Error("Expected seeded woodworking checklist fixture to exist.");
  }

  return seededChecklist;
}

function getRequiredRiskMatrix() {
  const seededRiskMatrix = getRiskMatrixBySlug("course-3x3");
  if (!seededRiskMatrix) {
    throw new Error("Expected seeded 3x3 risk matrix fixture to exist.");
  }

  return seededRiskMatrix;
}

function seedAssessmentWithTransferredRows() {
  const connection = createBootstrappedDatabase();
  const firstCriterion = checklist.sections[0]?.criteria[0];
  const secondCriterion = checklist.sections[0]?.criteria[1];

  if (!firstCriterion || !secondCriterion) {
    throw new Error("Expected first checklist section to contain at least two criteria.");
  }

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
    checklistId: checklist.id,
    checklistSlug: checklist.slug,
    checklistVersion: checklist.version,
    riskMatrixId: riskMatrix.id,
    status: "draft",
    startedAt,
    completedAt: null,
  }).run();

  connection.db.insert(finding).values([
    {
      id: "finding-2",
      ownerId: "owner-1",
      assessmentId: "assessment-1",
      criterionId: secondCriterion.id,
      status: "notOk",
      notes: "second inserted first",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt,
      updatedAt,
    },
    {
      id: "finding-1",
      ownerId: "owner-1",
      assessmentId: "assessment-1",
      criterionId: firstCriterion.id,
      status: "notOk",
      notes: "first inserted second",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt: new Date("2026-04-11T10:07:00.000Z"),
      updatedAt: new Date("2026-04-11T10:08:00.000Z"),
    },
  ]).run();

  connection.db.insert(riskEntry).values([
    {
      id: "risk-entry-2",
      ownerId: "owner-1",
      findingId: "finding-2",
      hazard: "Second hazard",
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
      id: "risk-entry-1",
      ownerId: "owner-1",
      findingId: "finding-1",
      hazard: "First hazard",
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
      id: "action-2",
      riskEntryId: "risk-entry-1",
      ownerId: "owner-1",
      description: "Second action",
      assigneeName: null,
      dueDate: null,
      status: "done",
      createdAt: new Date("2026-04-11T10:12:00.000Z"),
      updatedAt: new Date("2026-04-11T10:12:00.000Z"),
    },
    {
      id: "action-1",
      riskEntryId: "risk-entry-1",
      ownerId: "owner-1",
      description: "First action",
      assigneeName: "Supervisor",
      dueDate: new Date("2026-04-15T00:00:00.000Z"),
      status: "open",
      createdAt: new Date("2026-04-11T10:11:00.000Z"),
      updatedAt: new Date("2026-04-11T10:11:00.000Z"),
    },
  ]).run();

  return connection;
}

test("loadAssessmentRiskRegisterProjection preserves seeded criterion ordering for transferred rows", () => {
  const connection = seedAssessmentWithTransferredRows();

  const projection = loadAssessmentRiskRegisterProjection({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
  });

  assert.deepEqual(
    projection.entries.map((entry) => ({
      id: entry.id,
      criterionTitle: entry.criterionTitle,
      sectionTitle: entry.sectionTitle,
    })),
    [
      {
        id: "risk-entry-1",
        criterionTitle: checklist.sections[0]!.criteria[0]!.translations.is.title,
        sectionTitle: checklist.sections[0]!.translations.is.title,
      },
      {
        id: "risk-entry-2",
        criterionTitle: checklist.sections[0]!.criteria[1]!.translations.is.title,
        sectionTitle: checklist.sections[0]!.translations.is.title,
      },
    ],
  );

  closeDatabase(connection);
});

test("loadAssessmentRiskRegisterProjection reports stale risk-level mismatches without adding display copy", () => {
  const connection = seedAssessmentWithTransferredRows();

  connection.sqlite
    .prepare(`
      update risk_entry
      set likelihood = ?, consequence = ?, risk_level = ?
      where id = ?
    `)
    .run(1, 1, "high", "risk-entry-1");

  const projection = loadAssessmentRiskRegisterProjection({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
  });

  assert.equal(projection.entries[0]?.classificationState, "staleRiskLevel");
  assert.equal(projection.entries[0]?.savedRiskLevel, null);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      projection.entries[0] ?? {},
      "classificationMessage",
    ),
    false,
  );
  assert.equal(projection.entries[1]?.classificationState, "ready");

  closeDatabase(connection);
});

test("loadAssessmentRiskRegisterProjection includes mitigation actions in persisted order per risk entry", () => {
  const connection = seedAssessmentWithTransferredRows();

  const projection = loadAssessmentRiskRegisterProjection({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
  });

  assert.deepEqual(
    projection.entries[0]?.mitigationActions.map((action) => action.id),
    ["action-1", "action-2"],
  );
  assert.equal(projection.entries[0]?.mitigationActions[0]?.dueDate, "2026-04-15");
  assert.equal(projection.entries[1]?.mitigationActions.length, 0);

  closeDatabase(connection);
});
