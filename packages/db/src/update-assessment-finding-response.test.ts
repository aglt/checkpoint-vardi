import assert from "node:assert/strict";
import test from "node:test";

import { closeDatabase, createMigratedDatabase } from "./database.js";
import { updateAssessmentFindingResponse } from "./update-assessment-finding-response.js";
import { finding, riskAssessment, workplace } from "./schema.js";

const startedAt = new Date("2026-04-11T09:00:00.000Z");
const createdAt = new Date("2026-04-11T09:05:00.000Z");
const updatedAt = new Date("2026-04-11T09:10:00.000Z");

function seedFindingFixture() {
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
    checklistVersion: "2026-04-11",
    riskMatrixId: "course-3x3",
    status: "draft",
    startedAt,
    completedAt: null,
  }).run();

  connection.db.insert(finding).values({
    id: "finding-1",
    ownerId: "owner-1",
    assessmentId: "assessment-1",
    criterionId: "checklist.woodworking-workshop.section-01.criterion-01",
    status: "unanswered",
    notes: null,
    voiceTranscript: null,
    notesLanguage: null,
    createdAt,
    updatedAt,
  }).run();

  return connection;
}

test("updateAssessmentFindingResponse persists status and normalized notes by criterion id", () => {
  const connection = seedFindingFixture();
  const savedAt = new Date("2026-04-11T09:15:00.000Z");

  const updatedFinding = updateAssessmentFindingResponse({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
    criterionId: "checklist.woodworking-workshop.section-01.criterion-01",
    status: "notOk",
    notes: "  Missing blade guard  ",
    updatedAt: savedAt,
  });

  assert.equal(updatedFinding.status, "notOk");
  assert.equal(updatedFinding.notes, "Missing blade guard");
  assert.equal(updatedFinding.notesLanguage, "is");
  assert.deepEqual(updatedFinding.updatedAt, savedAt);

  closeDatabase(connection);
});

test("updateAssessmentFindingResponse clears notes and fails for missing owner-scoped rows", () => {
  const connection = seedFindingFixture();

  const clearedFinding = updateAssessmentFindingResponse({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
    criterionId: "checklist.woodworking-workshop.section-01.criterion-01",
    status: "ok",
    notes: "   ",
    updatedAt: new Date("2026-04-11T09:20:00.000Z"),
  });

  assert.equal(clearedFinding.status, "ok");
  assert.equal(clearedFinding.notes, null);
  assert.equal(clearedFinding.notesLanguage, null);

  assert.throws(
    () =>
      updateAssessmentFindingResponse({
        db: connection.db,
        ownerId: "owner-2",
        assessmentId: "assessment-1",
        criterionId: "checklist.woodworking-workshop.section-01.criterion-01",
        status: "notApplicable",
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "AssessmentFindingResponseNotFoundError",
  );

  closeDatabase(connection);
});
