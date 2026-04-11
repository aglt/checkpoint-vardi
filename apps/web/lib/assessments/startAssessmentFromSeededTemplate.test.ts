import assert from "node:assert/strict";
import test from "node:test";

import { getSeedChecklistById, getSeedChecklistBySlug, getRiskMatrixBySlug } from "@vardi/checklists";
import { closeDatabase, createMigratedDatabase } from "@vardi/db";

import {
  SeedChecklistNotFoundError,
  SeedRiskMatrixNotFoundError,
  startAssessmentFromSeededTemplate,
} from "./startAssessmentFromSeededTemplate";

const seededChecklist = getRequiredChecklist();
const seededRiskMatrix = getRequiredRiskMatrix();

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
    throw new Error("Expected seeded course risk matrix fixture to exist.");
  }

  return riskMatrix;
}

test("startAssessmentFromSeededTemplate fails before DB writes when the checklist is unknown", () => {
  const connection = createMigratedDatabase();

  assert.throws(
    () =>
      startAssessmentFromSeededTemplate({
        db: connection.db,
        ownerId: "owner-1",
        input: {
          workplaceName: "Workshop",
          workplaceAddress: "Austurberg 1",
          workplaceArchetype: "construction",
          checklistId: "missing-checklist",
        },
      }),
    (error: unknown) => error instanceof SeedChecklistNotFoundError,
  );

  const counts = connection.sqlite
    .prepare(`
      select
        (select count(*) from workplace) as workplaceCount,
        (select count(*) from risk_assessment) as assessmentCount,
        (select count(*) from finding) as findingCount
    `)
    .get() as {
      workplaceCount: number;
      assessmentCount: number;
      findingCount: number;
    };

  assert.deepEqual(counts, {
    workplaceCount: 0,
    assessmentCount: 0,
    findingCount: 0,
  });

  closeDatabase(connection);
});

test("startAssessmentFromSeededTemplate fails before DB writes when the fixed matrix is missing", () => {
  const connection = createMigratedDatabase();

  assert.throws(
    () =>
      startAssessmentFromSeededTemplate({
        db: connection.db,
        ownerId: "owner-1",
        input: {
          workplaceName: "Workshop",
          workplaceAddress: "Austurberg 1",
          workplaceArchetype: "construction",
          checklistId: seededChecklist.id,
        },
        seedRuntime: {
          getChecklistById: getSeedChecklistById,
          getRiskMatrixBySlug: () => undefined,
        },
      }),
    (error: unknown) => error instanceof SeedRiskMatrixNotFoundError,
  );

  const counts = connection.sqlite
    .prepare(`
      select
        (select count(*) from workplace) as workplaceCount,
        (select count(*) from risk_assessment) as assessmentCount,
        (select count(*) from finding) as findingCount
    `)
    .get() as {
      workplaceCount: number;
      assessmentCount: number;
      findingCount: number;
    };

  assert.deepEqual(counts, {
    workplaceCount: 0,
    assessmentCount: 0,
    findingCount: 0,
  });

  closeDatabase(connection);
});

test("startAssessmentFromSeededTemplate persists a seeded assessment ready for walkthrough startup", () => {
  const connection = createMigratedDatabase();

  const result = startAssessmentFromSeededTemplate({
    db: connection.db,
    ownerId: "owner-1",
    input: {
      workplaceName: "Workshop",
      workplaceAddress: "Austurberg 1",
      workplaceArchetype: "construction",
      checklistId: seededChecklist.id,
    },
  });

  const persistedAssessment = connection.sqlite
    .prepare(`
      select
        checklist_id as checklistId,
        checklist_slug as checklistSlug,
        checklist_version as checklistVersion,
        risk_matrix_id as riskMatrixId
      from risk_assessment
      where id = ?
    `)
    .get(result.assessmentId) as
      | {
          checklistId: string;
          checklistSlug: string;
          checklistVersion: string;
          riskMatrixId: string;
        }
      | undefined;

  assert.ok(persistedAssessment);
  assert.equal(persistedAssessment.checklistId, seededChecklist.id);
  assert.equal(persistedAssessment.checklistSlug, seededChecklist.slug);
  assert.equal(persistedAssessment.checklistVersion, seededChecklist.version);
  assert.equal(persistedAssessment.riskMatrixId, seededRiskMatrix.id);

  closeDatabase(connection);
});
