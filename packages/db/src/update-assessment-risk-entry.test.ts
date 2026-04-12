import assert from "node:assert/strict";
import test from "node:test";

import { eq } from "drizzle-orm";

import { closeDatabase, createMigratedDatabase } from "./database.js";
import {
  AssessmentRiskEntryNotFoundError,
  updateAssessmentRiskEntry,
} from "./update-assessment-risk-entry.js";
import { finding, riskAssessment, riskEntry, workplace } from "./schema.js";

const startedAt = new Date("2026-04-12T09:00:00.000Z");
const createdAt = new Date("2026-04-12T09:05:00.000Z");

function seedRiskEntryFixture() {
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
      checklistId: "checklist.woodworking-workshop",
      checklistSlug: "woodworking-workshop",
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

  return connection;
}

test("updateAssessmentRiskEntry updates only the owner-scoped transferred row and preserves findingId", () => {
  const connection = seedRiskEntryFixture();

  const updatedRiskEntry = updateAssessmentRiskEntry({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-owner-1-a",
    riskEntryId: "risk-entry-owner-1-a",
    hazard: "Updated guarding on saw",
    healthEffects: "Hand injury",
    whoAtRisk: "Students",
    likelihood: 2,
    consequence: 3,
    derivedRiskLevel: "high",
    currentControls: "Signage in place",
    costEstimate: 25000,
  });

  assert.equal(updatedRiskEntry.id, "risk-entry-owner-1-a");
  assert.equal(updatedRiskEntry.findingId, "finding-owner-1-a");
  assert.equal(updatedRiskEntry.hazard, "Updated guarding on saw");
  assert.equal(updatedRiskEntry.healthEffects, "Hand injury");
  assert.equal(updatedRiskEntry.whoAtRisk, "Students");
  assert.equal(updatedRiskEntry.likelihood, 2);
  assert.equal(updatedRiskEntry.consequence, 3);
  assert.equal(updatedRiskEntry.riskLevel, "high");
  assert.equal(updatedRiskEntry.currentControls, "Signage in place");
  assert.equal(updatedRiskEntry.costEstimate, 25000);

  const untouchedRiskEntry = connection.db
    .select()
    .from(riskEntry)
    .where(eq(riskEntry.id, "risk-entry-owner-1-b"))
    .get();

  assert.equal(untouchedRiskEntry?.hazard, "Safety signage");
  assert.equal(untouchedRiskEntry?.findingId, "finding-owner-1-b");

  closeDatabase(connection);
});

test("updateAssessmentRiskEntry rejects rows outside the owner or assessment boundary", () => {
  const connection = seedRiskEntryFixture();

  assert.throws(
    () =>
      updateAssessmentRiskEntry({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-owner-1-a",
        riskEntryId: "risk-entry-owner-1-b",
        hazard: "Wrong assessment",
        derivedRiskLevel: null,
      }),
    (error: unknown) => error instanceof AssessmentRiskEntryNotFoundError,
  );

  assert.throws(
    () =>
      updateAssessmentRiskEntry({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-owner-2",
        riskEntryId: "risk-entry-owner-2",
        hazard: "Wrong owner",
        derivedRiskLevel: null,
      }),
    (error: unknown) => error instanceof AssessmentRiskEntryNotFoundError,
  );

  const persistedRiskEntry = connection.db
    .select()
    .from(riskEntry)
    .where(eq(riskEntry.id, "risk-entry-owner-2"))
    .get();

  assert.equal(persistedRiskEntry?.hazard, "Different owner hazard");
  assert.equal(persistedRiskEntry?.findingId, "finding-owner-2");

  closeDatabase(connection);
});
