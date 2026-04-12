import assert from "node:assert/strict";
import test from "node:test";

import { closeDatabase, createMigratedDatabase } from "./database.js";
import {
  MissingRiskEntryHazardError,
  transferAssessmentFindingsToRiskRegister,
} from "./transfer-assessment-findings-to-risk-register.js";
import { finding, riskAssessment, riskEntry, workplace } from "./schema.js";

const startedAt = new Date("2026-04-12T09:00:00.000Z");
const createdAt = new Date("2026-04-12T09:05:00.000Z");
const updatedAt = new Date("2026-04-12T09:10:00.000Z");

function seedTransferFixture() {
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
    riskMatrixId: "course-3x3",
    status: "draft",
    startedAt,
    completedAt: null,
  }).run();

  connection.db.insert(finding).values([
    {
      id: "finding-not-ok-missing",
      ownerId: "owner-1",
      assessmentId: "assessment-1",
      criterionId: "criterion-not-ok-missing",
      status: "notOk",
      notes: "Broken guard",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt,
      updatedAt,
    },
    {
      id: "finding-not-ok-existing",
      ownerId: "owner-1",
      assessmentId: "assessment-1",
      criterionId: "criterion-not-ok-existing",
      status: "notOk",
      notes: "Missing signage",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt,
      updatedAt,
    },
    {
      id: "finding-ok",
      ownerId: "owner-1",
      assessmentId: "assessment-1",
      criterionId: "criterion-ok",
      status: "ok",
      notes: "Compliant",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt,
      updatedAt,
    },
    {
      id: "finding-not-applicable",
      ownerId: "owner-1",
      assessmentId: "assessment-1",
      criterionId: "criterion-not-applicable",
      status: "notApplicable",
      notes: null,
      voiceTranscript: null,
      notesLanguage: null,
      createdAt,
      updatedAt,
    },
    {
      id: "finding-unanswered",
      ownerId: "owner-1",
      assessmentId: "assessment-1",
      criterionId: "criterion-unanswered",
      status: "unanswered",
      notes: null,
      voiceTranscript: null,
      notesLanguage: null,
      createdAt,
      updatedAt,
    },
  ]).run();

  return connection;
}

test("transferAssessmentFindingsToRiskRegister inserts only missing notOk risk rows", () => {
  const connection = seedTransferFixture();

  connection.db.insert(riskEntry).values({
    id: "risk-entry-existing",
    ownerId: "owner-1",
    findingId: "finding-not-ok-existing",
    hazard: "Existing hazard",
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

  const result = transferAssessmentFindingsToRiskRegister({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
    hazardByCriterionId: {
      "criterion-not-ok-missing": "Guarding on table saw",
      "criterion-not-ok-existing": "Safety signage",
    },
  });

  assert.deepEqual(result, {
    assessmentId: "assessment-1",
    eligibleFindingCount: 2,
    createdRiskEntryCount: 1,
    existingRiskEntryCount: 1,
  });

  const persistedEntries = connection.sqlite
    .prepare(`
      select
        owner_id as ownerId,
        finding_id as findingId,
        hazard,
        health_effects as healthEffects,
        who_at_risk as whoAtRisk,
        likelihood,
        consequence,
        risk_level as riskLevel,
        current_controls as currentControls,
        proposed_action as proposedAction,
        responsible_owner as responsibleOwner
      from risk_entry
      order by finding_id
    `)
    .all() as Array<{
      ownerId: string;
      findingId: string;
      hazard: string | null;
      healthEffects: string | null;
      whoAtRisk: string | null;
      likelihood: number | null;
      consequence: number | null;
      riskLevel: string | null;
      currentControls: string | null;
      proposedAction: string | null;
      responsibleOwner: string | null;
    }>;

  assert.equal(persistedEntries.length, 2);
  assert.deepEqual(persistedEntries[0], {
    ownerId: "owner-1",
    findingId: "finding-not-ok-existing",
    hazard: "Existing hazard",
    healthEffects: null,
    whoAtRisk: null,
    likelihood: null,
    consequence: null,
    riskLevel: null,
    currentControls: null,
    proposedAction: null,
    responsibleOwner: null,
  });
  assert.deepEqual(persistedEntries[1], {
    ownerId: "owner-1",
    findingId: "finding-not-ok-missing",
    hazard: "Guarding on table saw",
    healthEffects: null,
    whoAtRisk: null,
    likelihood: null,
    consequence: null,
    riskLevel: null,
    currentControls: null,
    proposedAction: null,
    responsibleOwner: null,
  });

  closeDatabase(connection);
});

test("transferAssessmentFindingsToRiskRegister re-runs deterministically without duplicates", () => {
  const connection = seedTransferFixture();

  const firstTransfer = transferAssessmentFindingsToRiskRegister({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
    hazardByCriterionId: {
      "criterion-not-ok-missing": "Guarding on table saw",
      "criterion-not-ok-existing": "Safety signage",
    },
  });
  const secondTransfer = transferAssessmentFindingsToRiskRegister({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
    hazardByCriterionId: {
      "criterion-not-ok-missing": "Guarding on table saw",
      "criterion-not-ok-existing": "Safety signage",
    },
  });

  assert.deepEqual(firstTransfer, {
    assessmentId: "assessment-1",
    eligibleFindingCount: 2,
    createdRiskEntryCount: 2,
    existingRiskEntryCount: 0,
  });
  assert.deepEqual(secondTransfer, {
    assessmentId: "assessment-1",
    eligibleFindingCount: 2,
    createdRiskEntryCount: 0,
    existingRiskEntryCount: 2,
  });

  const persistedCount = connection.sqlite
    .prepare("select count(*) as count from risk_entry")
    .get() as { count: number };

  assert.equal(persistedCount.count, 2);

  closeDatabase(connection);
});

test("transferAssessmentFindingsToRiskRegister rolls back when a hazard mapping is missing", () => {
  const connection = seedTransferFixture();

  assert.throws(
    () =>
      transferAssessmentFindingsToRiskRegister({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-1",
        hazardByCriterionId: {
          "criterion-not-ok-missing": "Guarding on table saw",
        },
      }),
    (error: unknown) => error instanceof MissingRiskEntryHazardError,
  );

  const persistedCount = connection.sqlite
    .prepare("select count(*) as count from risk_entry")
    .get() as { count: number };

  assert.equal(persistedCount.count, 0);

  closeDatabase(connection);
});
