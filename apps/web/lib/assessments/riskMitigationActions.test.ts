import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { mock } from "node:test";

import { getRiskMatrixBySlug, getSeedChecklistBySlug } from "@vardi/checklists";
import {
  closeDatabase,
  createBootstrappedDatabase,
  createWorkplaceAssessment,
  loadAssessmentAggregate,
} from "@vardi/db/testing";

import {
  CreateAssessmentRiskMitigationActionError,
  createAssessmentRiskMitigationAction,
} from "./createAssessmentRiskMitigationAction";
import {
  DeleteAssessmentRiskMitigationActionError,
  deleteAssessmentRiskMitigationAction,
} from "./deleteAssessmentRiskMitigationAction";
import {
  UpdateAssessmentRiskMitigationActionError,
  updateAssessmentRiskMitigationAction,
} from "./updateAssessmentRiskMitigationAction";

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
    mkdtempSync(join(tmpdir(), "vardi-s1-11-")),
    "checkpoint-vardi.db",
  );
  const checklist = getRequiredChecklist();
  const riskMatrix = getRequiredRiskMatrix();
  const targetCriterion = checklist.sections[0]?.criteria[1];

  if (!targetCriterion) {
    throw new Error("Expected checklist fixture to contain a transferable criterion.");
  }

  const connection = createBootstrappedDatabase(databasePath);
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
    databasePath,
    assessmentId: assessment.assessmentId,
    targetCriterion,
  };
}

async function transferCriterion(
  fixture: ReturnType<typeof seedTransferredRiskEntryFixture>,
) {
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

  const connection = createBootstrappedDatabase(fixture.databasePath);
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

  if (!riskEntryRow) {
    closeDatabase(connection);
    throw new Error("Expected transferred risk entry to exist.");
  }

  closeDatabase(connection);
  return riskEntryRow.id;
}

test("createAssessmentRiskMitigationAction trims values and stores date-only fields at UTC midnight", async () => {
  const fixture = seedTransferredRiskEntryFixture();
  const riskEntryId = await transferCriterion(fixture);
  const connection = createBootstrappedDatabase(fixture.databasePath);

  const output = createAssessmentRiskMitigationAction({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
    input: {
      riskEntryId,
      description: "  Install replacement guard  ",
      assigneeName: "  Workshop lead  ",
      dueDate: "2026-04-20",
      status: "inProgress",
    },
  });

  assert.equal(output.riskEntryId, riskEntryId);
  assert.equal(output.description, "Install replacement guard");
  assert.equal(output.assigneeName, "Workshop lead");
  assert.equal(output.dueDate, "2026-04-20");
  assert.equal(output.status, "inProgress");

  const persistedActionRow = connection.sqlite
    .prepare(`
      select due_date
      from risk_mitigation_action
      where id = ?
    `)
    .get(output.mitigationActionId) as { due_date: number | null } | undefined;

  assert.ok(persistedActionRow);
  assert.equal(
    new Date(persistedActionRow!.due_date!).toISOString(),
    "2026-04-20T00:00:00.000Z",
  );

  closeDatabase(connection);
});

test("updateAssessmentRiskMitigationAction normalizes optional fields and deleteAssessmentRiskMitigationAction removes the saved row", async () => {
  const fixture = seedTransferredRiskEntryFixture();
  const riskEntryId = await transferCriterion(fixture);
  const connection = createBootstrappedDatabase(fixture.databasePath);

  const createdAction = createAssessmentRiskMitigationAction({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
    input: {
      riskEntryId,
      description: "Install replacement guard",
      assigneeName: "Workshop lead",
      dueDate: "2026-04-20",
      status: "open",
    },
  });

  const updatedAction = updateAssessmentRiskMitigationAction({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
    input: {
      mitigationActionId: createdAction.mitigationActionId,
      description: "  Verify the new guard during induction  ",
      assigneeName: "   ",
      dueDate: undefined,
      status: "done",
    },
  });

  assert.equal(updatedAction.description, "Verify the new guard during induction");
  assert.equal(updatedAction.assigneeName, null);
  assert.equal(updatedAction.dueDate, null);
  assert.equal(updatedAction.status, "done");

  const deleteOutput = deleteAssessmentRiskMitigationAction({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
    input: {
      mitigationActionId: createdAction.mitigationActionId,
    },
  });

  assert.deepEqual(deleteOutput, {
    assessmentId: fixture.assessmentId,
    riskEntryId,
    mitigationActionId: createdAction.mitigationActionId,
  });

  const remainingAction = connection.sqlite
    .prepare(`
      select id
      from risk_mitigation_action
      where id = ?
    `)
    .get(createdAction.mitigationActionId) as { id: string } | undefined;

  assert.equal(remainingAction, undefined);

  closeDatabase(connection);
});

test("risk mitigation action mutations return client-safe validation and missing-row errors", async () => {
  const fixture = seedTransferredRiskEntryFixture();
  const riskEntryId = await transferCriterion(fixture);
  const connection = createBootstrappedDatabase(fixture.databasePath);

  assert.throws(
    () =>
      createAssessmentRiskMitigationAction({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: fixture.assessmentId,
        input: {
          riskEntryId,
          description: "   ",
          status: "open",
        },
      }),
    (error: unknown) =>
      error instanceof CreateAssessmentRiskMitigationActionError &&
      error.status === 400 &&
      error.code === "invalid-risk-mitigation-action-create-request",
  );

  assert.throws(
    () =>
      createAssessmentRiskMitigationAction({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: fixture.assessmentId,
        input: {
          riskEntryId: "missing-risk-entry",
          description: "Install replacement guard",
          status: "open",
        },
      }),
    (error: unknown) =>
      error instanceof CreateAssessmentRiskMitigationActionError &&
      error.status === 404 &&
      error.code === "risk-entry-not-found",
  );

  assert.throws(
    () =>
      updateAssessmentRiskMitigationAction({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: fixture.assessmentId,
        input: {
          mitigationActionId: "missing-action",
          description: "Install replacement guard",
          status: "open",
        },
      }),
    (error: unknown) =>
      error instanceof UpdateAssessmentRiskMitigationActionError &&
      error.status === 404 &&
      error.code === "risk-mitigation-action-not-found",
  );

  assert.throws(
    () =>
      deleteAssessmentRiskMitigationAction({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: fixture.assessmentId,
        input: {
          mitigationActionId: "missing-action",
        },
      }),
    (error: unknown) =>
      error instanceof DeleteAssessmentRiskMitigationActionError &&
      error.status === 404 &&
      error.code === "risk-mitigation-action-not-found",
  );

  closeDatabase(connection);
});

test("risk mitigation action mutations convert unexpected failures into client-safe 500 errors", async () => {
  const fixture = seedTransferredRiskEntryFixture();
  const riskEntryId = await transferCriterion(fixture);
  const connection = createBootstrappedDatabase(fixture.databasePath);
  const consoleErrorMock = mock.method(console, "error", () => undefined);

  assert.throws(
    () =>
      createAssessmentRiskMitigationAction({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: fixture.assessmentId,
        input: {
          riskEntryId,
          description: "Install replacement guard",
          status: "open",
        },
        dependencies: {
          createAssessmentRiskMitigationAction: () => {
            throw new Error("boom");
          },
        },
      }),
    (error: unknown) =>
      error instanceof CreateAssessmentRiskMitigationActionError &&
      error.status === 500 &&
      error.code === "risk-mitigation-action-create-unavailable",
  );

  assert.throws(
    () =>
      updateAssessmentRiskMitigationAction({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: fixture.assessmentId,
        input: {
          mitigationActionId: "action-1",
          description: "Install replacement guard",
          status: "done",
        },
        dependencies: {
          updateAssessmentRiskMitigationAction: () => {
            throw new Error("boom");
          },
        },
      }),
    (error: unknown) =>
      error instanceof UpdateAssessmentRiskMitigationActionError &&
      error.status === 500 &&
      error.code === "risk-mitigation-action-update-unavailable",
  );

  assert.throws(
    () =>
      deleteAssessmentRiskMitigationAction({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: fixture.assessmentId,
        input: {
          mitigationActionId: "action-1",
        },
        dependencies: {
          deleteAssessmentRiskMitigationAction: () => {
            throw new Error("boom");
          },
        },
      }),
    (error: unknown) =>
      error instanceof DeleteAssessmentRiskMitigationActionError &&
      error.status === 500 &&
      error.code === "risk-mitigation-action-delete-unavailable",
  );

  consoleErrorMock.mock.restore();
  closeDatabase(connection);
});
