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
  updateAssessmentFindingResponse,
} from "@vardi/db";
import { renderToStaticMarkup } from "react-dom/server";

import { loadAssessmentReadModel } from "./loadAssessmentReadModel";

const startedAt = new Date("2026-04-11T10:00:00.000Z");

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

function seedWalkthroughAssessment() {
  const databasePath = join(
    mkdtempSync(join(tmpdir(), "vardi-s1-04-")),
    "checkpoint-vardi.db",
  );
  const checklist = getRequiredChecklist();
  const riskMatrix = getRequiredRiskMatrix();
  const firstCriterion = checklist.sections[0]?.criteria[0];
  const secondCriterion = checklist.sections[0]?.criteria[1];

  if (!firstCriterion || !secondCriterion) {
    throw new Error("Expected checklist fixture to contain at least two criteria.");
  }

  const connection = createMigratedDatabase(databasePath);
  const result = createWorkplaceAssessment({
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
    assessmentId: result.assessmentId,
    checklist,
    databasePath,
    firstCriterion,
    riskMatrix,
    secondCriterion,
  };
}

test("walkthrough save route persists answers by stable criterion id", async () => {
  const fixture = seedWalkthroughAssessment();
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const { PATCH } = await import(
    "../../app/api/assessments/[assessmentId]/responses/route"
  );

  const response = await PATCH(
    new Request(
      `http://localhost:3000/api/assessments/${fixture.assessmentId}/responses`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          criterionId: fixture.secondCriterion.id,
          status: "notOk",
          notes: "  Missing guard  ",
        }),
      },
    ),
    {
      params: Promise.resolve({
        assessmentId: fixture.assessmentId,
      }),
    },
  );

  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(payload.criterionId, fixture.secondCriterion.id);
  assert.equal(payload.status, "notOk");
  assert.equal(payload.notes, "Missing guard");

  const connection = createMigratedDatabase(fixture.databasePath);
  const readModel = loadAssessmentReadModel({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
  });
  const persistedCriterion = readModel.sections
    .flatMap((section) => section.criteria)
    .find((criterion) => criterion.id === fixture.secondCriterion.id);

  assert.ok(persistedCriterion);
  assert.equal(persistedCriterion.response.status, "notOk");
  assert.equal(persistedCriterion.response.notes, "Missing guard");

  closeDatabase(connection);
});

test("assessment page renders seeded walkthrough content and resumed notes", async () => {
  const fixture = seedWalkthroughAssessment();
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const connection = createMigratedDatabase(fixture.databasePath);
  updateAssessmentFindingResponse({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
    criterionId: fixture.firstCriterion.id,
    status: "notApplicable",
    notes: "Already reviewed on-site.",
    updatedAt: new Date("2026-04-11T10:07:00.000Z"),
  });
  closeDatabase(connection);

  const { default: AssessmentPage } = await import(
    "../../app/assessments/[assessmentId]/page"
  );
  const markup = renderToStaticMarkup(
    await AssessmentPage({
      params: Promise.resolve({
        assessmentId: fixture.assessmentId,
      }),
    }),
  );

  assert.match(markup, new RegExp(escapeRegExp("FB workshop")));
  assert.match(
    markup,
    new RegExp(escapeRegExp(fixture.checklist.translations.is.title)),
  );
  assert.match(
    markup,
    new RegExp(escapeRegExp(fixture.checklist.sections[0]?.translations.is.title ?? "")),
  );
  assert.match(
    markup,
    new RegExp(escapeRegExp(fixture.firstCriterion.translations.is.title)),
  );
  assert.match(
    markup,
    new RegExp(escapeRegExp(fixture.firstCriterion.translations.is.guidance)),
  );
  assert.match(markup, new RegExp(escapeRegExp("Already reviewed on-site.")));
  assert.match(markup, /Answers save immediately/);
});

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
