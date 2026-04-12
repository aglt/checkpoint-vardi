import assert from "node:assert/strict";
import test from "node:test";

import { eq } from "drizzle-orm";

import { closeDatabase, createMigratedDatabase } from "./database.js";
import {
  AssessmentSummaryNotFoundError,
  upsertAssessmentSummary,
} from "./upsert-assessment-summary.js";
import { assessmentSummary, riskAssessment, workplace } from "./schema.js";

const startedAt = new Date("2026-04-12T09:00:00.000Z");
const assessmentDate = new Date("2026-04-20T00:00:00.000Z");

function seedAssessmentFixture() {
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
      riskMatrixId: "course-3x3",
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
      riskMatrixId: "course-3x3",
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
      riskMatrixId: "course-3x3",
      status: "draft",
      startedAt,
      completedAt: null,
    },
  ]).run();

  return connection;
}

test("upsertAssessmentSummary inserts the first owner-scoped summary row", () => {
  const connection = seedAssessmentFixture();

  const savedSummary = upsertAssessmentSummary({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-owner-1-a",
    companyName: "  Checkpoint Vardi  ",
    location: "  Reykjavik workshop  ",
    assessmentDate,
    participants: "  Student assessor  ",
    method: "  Walkthrough  ",
    notes: "  Prioritize machine guarding first.  ",
  });

  assert.equal(savedSummary.assessmentId, "assessment-owner-1-a");
  assert.equal(savedSummary.ownerId, "owner-1");
  assert.equal(savedSummary.companyName, "Checkpoint Vardi");
  assert.equal(savedSummary.location, "Reykjavik workshop");
  assert.deepEqual(savedSummary.assessmentDate, assessmentDate);
  assert.equal(savedSummary.participants, "Student assessor");
  assert.equal(savedSummary.method, "Walkthrough");
  assert.equal(savedSummary.notes, "Prioritize machine guarding first.");

  closeDatabase(connection);
});

test("upsertAssessmentSummary updates the existing row and normalizes cleared values to null", () => {
  const connection = seedAssessmentFixture();

  connection.db.insert(assessmentSummary).values({
    assessmentId: "assessment-owner-1-a",
    ownerId: "owner-1",
    companyName: "Existing company",
    location: "Existing location",
    assessmentDate,
    participants: "Existing participants",
    method: "Existing method",
    notes: "Existing notes",
  }).run();

  const updatedSummary = upsertAssessmentSummary({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-owner-1-a",
    companyName: "  Updated company  ",
    location: "   ",
    assessmentDate: null,
    participants: null,
    method: "  Updated method  ",
    notes: "   ",
  });

  assert.equal(updatedSummary.companyName, "Updated company");
  assert.equal(updatedSummary.location, null);
  assert.equal(updatedSummary.assessmentDate, null);
  assert.equal(updatedSummary.participants, null);
  assert.equal(updatedSummary.method, "Updated method");
  assert.equal(updatedSummary.notes, null);

  const summaryRows = connection.db
    .select()
    .from(assessmentSummary)
    .where(eq(assessmentSummary.assessmentId, "assessment-owner-1-a"))
    .all();

  assert.equal(summaryRows.length, 1);

  closeDatabase(connection);
});

test("upsertAssessmentSummary rejects assessments outside the owner boundary", () => {
  const connection = seedAssessmentFixture();

  assert.throws(
    () =>
      upsertAssessmentSummary({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-owner-2",
        companyName: "Wrong owner",
      }),
    (error: unknown) => error instanceof AssessmentSummaryNotFoundError,
  );

  assert.throws(
    () =>
      upsertAssessmentSummary({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "missing-assessment",
        companyName: "Missing row",
      }),
    (error: unknown) => error instanceof AssessmentSummaryNotFoundError,
  );

  closeDatabase(connection);
});
