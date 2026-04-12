import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { getRiskMatrixBySlug, getSeedChecklistBySlug } from "@vardi/checklists";
import {
  closeDatabase,
  createMigratedDatabase,
  createWorkplaceAssessment,
  loadAssessmentAggregate,
} from "@vardi/db";

import { AssessmentReadModelIntegrityError, loadAssessmentReadModel } from "./loadAssessmentReadModel";

const startedAt = new Date("2026-04-12T10:00:00.000Z");

function getRequiredChecklist() {
  const checklist = getSeedChecklistBySlug("woodworking-workshop");

  if (!checklist) {
    throw new Error("Expected seeded woodworking checklist fixture to exist.");
  }

  return checklist;
}

function getRequiredRiskMatrix() {
  const riskMatrix = getRiskMatrixBySlug("course-3x3");

  if (!riskMatrix) {
    throw new Error("Expected seeded 3x3 risk matrix fixture to exist.");
  }

  return riskMatrix;
}

function seedTransferredRiskEntryFixture() {
  const databasePath = join(
    mkdtempSync(join(tmpdir(), "vardi-s1-06-")),
    "checkpoint-vardi.db",
  );
  const checklist = getRequiredChecklist();
  const riskMatrix = getRequiredRiskMatrix();
  const targetCriterion = checklist.sections[0]?.criteria[1];

  if (!targetCriterion) {
    throw new Error("Expected checklist fixture to contain a transferable criterion.");
  }

  const connection = createMigratedDatabase(databasePath);
  const assessment = createWorkplaceAssessment({
    db: connection.db,
    ownerId: "owner-1",
    workplace: {
      name: "FB workshop",
      address: "Austurberg 5",
      archetype: "construction",
      primaryLanguage: "is",
    },
    assessment: {
      checklistId: checklist.id,
      checklistSlug: checklist.slug,
      checklistVersion: checklist.version,
      riskMatrixId: riskMatrix.id,
      startedAt,
    },
    criterionIds: checklist.sections.flatMap((section) =>
      section.criteria.map((criterion) => criterion.id),
    ),
  });
  closeDatabase(connection);

  return {
    assessmentId: assessment.assessmentId,
    checklist,
    databasePath,
    targetCriterion,
  };
}

async function transferTargetCriterion(fixture: ReturnType<typeof seedTransferredRiskEntryFixture>) {
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const { saveAssessmentCriterionResponseAction } = await import(
    "./saveAssessmentCriterionResponseAction"
  );
  const { transferAssessmentFindingsToRiskRegisterAction } = await import(
    "./transferAssessmentFindingsToRiskRegisterAction"
  );

  await saveAssessmentCriterionResponseAction({
    assessmentId: fixture.assessmentId,
    input: {
      criterionId: fixture.targetCriterion.id,
      status: "notOk",
      notes: "Missing guard",
    },
  });
  await transferAssessmentFindingsToRiskRegisterAction({
    assessmentId: fixture.assessmentId,
  });

  const connection = createMigratedDatabase(fixture.databasePath);
  const aggregate = loadAssessmentAggregate({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
  });
  const findingRow = aggregate.findings.find(
    (entry) => entry.criterionId === fixture.targetCriterion.id,
  );

  if (!findingRow) {
    closeDatabase(connection);
    throw new Error("Expected transferred finding to exist.");
  }

  const riskEntryRow = aggregate.riskEntries.find(
    (entry) => entry.findingId === findingRow.id,
  );

  closeDatabase(connection);

  if (!riskEntryRow) {
    throw new Error("Expected transferred risk entry to exist.");
  }

  return riskEntryRow.id;
}

test("saveAssessmentRiskEntryAction derives and persists the authoritative risk level from seeded matrix truth", async () => {
  const fixture = seedTransferredRiskEntryFixture();
  const riskEntryId = await transferTargetCriterion(fixture);
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const { saveAssessmentRiskEntryAction } = await import(
    "./saveAssessmentRiskEntryAction"
  );

  const output = await saveAssessmentRiskEntryAction({
    assessmentId: fixture.assessmentId,
    input: {
      riskEntryId,
      hazard: "  Table saw without guard  ",
      healthEffects: "  Hand injury  ",
      whoAtRisk: "  Students and staff  ",
      likelihood: 2,
      consequence: 3,
      currentControls: "  Safety signage  ",
      proposedAction: "  Install a replacement guard  ",
      costEstimate: 25000,
      responsibleOwner: "  Workshop lead  ",
      dueDate: "2026-04-20",
      completedAt: "2026-04-22",
    },
  });

  assert.deepEqual(output, {
    assessmentId: fixture.assessmentId,
    riskEntryId,
    hazard: "Table saw without guard",
    healthEffects: "Hand injury",
    whoAtRisk: "Students and staff",
    likelihood: 2,
    consequence: 3,
    riskLevel: "high",
    currentControls: "Safety signage",
    proposedAction: "Install a replacement guard",
    costEstimate: 25000,
    responsibleOwner: "Workshop lead",
    dueDate: "2026-04-20",
    completedAt: "2026-04-22",
  });

  const connection = createMigratedDatabase(fixture.databasePath);
  const readModel = loadAssessmentReadModel({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
  });
  const persistedCriterion = readModel.sections
    .flatMap((section) => section.criteria)
    .find((criterion) => criterion.id === fixture.targetCriterion.id);

  assert.ok(persistedCriterion?.riskEntry);
  assert.equal(persistedCriterion.riskEntry?.hazard, "Table saw without guard");
  assert.equal(persistedCriterion.riskEntry?.riskLevel, "high");
  assert.equal(persistedCriterion.riskEntry?.dueDate, "2026-04-20");
  assert.equal(persistedCriterion.riskEntry?.completedAt, "2026-04-22");

  closeDatabase(connection);
});

test("saveAssessmentRiskEntryAction leaves risk level null until both scores are present", async () => {
  const fixture = seedTransferredRiskEntryFixture();
  const riskEntryId = await transferTargetCriterion(fixture);
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const { saveAssessmentRiskEntryAction } = await import(
    "./saveAssessmentRiskEntryAction"
  );

  const output = await saveAssessmentRiskEntryAction({
    assessmentId: fixture.assessmentId,
    input: {
      riskEntryId,
      hazard: "Table saw without guard",
      healthEffects: undefined,
      whoAtRisk: undefined,
      likelihood: 2,
      consequence: undefined,
      currentControls: undefined,
      proposedAction: undefined,
      costEstimate: undefined,
      responsibleOwner: undefined,
      dueDate: undefined,
      completedAt: undefined,
    },
  });

  assert.equal(output.riskLevel, null);

  const connection = createMigratedDatabase(fixture.databasePath);
  const readModel = loadAssessmentReadModel({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
  });
  const persistedCriterion = readModel.sections
    .flatMap((section) => section.criteria)
    .find((criterion) => criterion.id === fixture.targetCriterion.id);

  assert.ok(persistedCriterion?.riskEntry);
  assert.equal(persistedCriterion.riskEntry?.likelihood, 2);
  assert.equal(persistedCriterion.riskEntry?.consequence, null);
  assert.equal(persistedCriterion.riskEntry?.riskLevel, null);

  closeDatabase(connection);
});

test("saveAssessmentRiskEntry rejects client-supplied riskLevel and missing rows with client-safe errors", async () => {
  const fixture = seedTransferredRiskEntryFixture();
  const riskEntryId = await transferTargetCriterion(fixture);
  const connection = createMigratedDatabase(fixture.databasePath);
  const { SaveAssessmentRiskEntryError, saveAssessmentRiskEntry } = await import(
    "./saveAssessmentRiskEntry"
  );

  assert.throws(
    () =>
      saveAssessmentRiskEntry({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: fixture.assessmentId,
        input: {
          riskEntryId,
          hazard: "Hazard",
          riskLevel: "high",
        } as never,
      }),
    (error: unknown) =>
      error instanceof SaveAssessmentRiskEntryError &&
      error.status === 400 &&
      error.code === "invalid-risk-entry-save-request",
  );

  assert.throws(
    () =>
      saveAssessmentRiskEntry({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: fixture.assessmentId,
        input: {
          riskEntryId: "missing-risk-entry",
          hazard: "Hazard",
        },
      }),
    (error: unknown) =>
      error instanceof SaveAssessmentRiskEntryError &&
      error.status === 404 &&
      error.code === "risk-entry-not-found",
  );

  closeDatabase(connection);
});

test("saveAssessmentRiskEntry maps deterministic integrity failures to a client-safe error", async () => {
  const fixture = seedTransferredRiskEntryFixture();
  const connection = createMigratedDatabase(fixture.databasePath);
  const { SaveAssessmentRiskEntryError, saveAssessmentRiskEntry } = await import(
    "./saveAssessmentRiskEntry"
  );

  assert.throws(
    () =>
      saveAssessmentRiskEntry({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: fixture.assessmentId,
        input: {
          riskEntryId: "risk-entry-1",
          hazard: "Hazard",
        },
        dependencies: {
          loadAssessmentReadModel: () => {
            throw new AssessmentReadModelIntegrityError("Seed drift");
          },
        },
      }),
    (error: unknown) =>
      error instanceof SaveAssessmentRiskEntryError &&
      error.status === 500 &&
      error.code === "risk-entry-save-unavailable",
  );

  closeDatabase(connection);
});
