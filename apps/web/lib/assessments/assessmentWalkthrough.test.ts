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
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { loadAssessmentReadModel } from "./loadAssessmentReadModel";
import { loadAssessmentRiskRegisterProjection } from "./loadAssessmentRiskRegisterProjection";

const startedAt = new Date("2026-04-11T10:00:00.000Z");
const appRouterStub: AppRouterInstance = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
};

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

async function transferCriteriaToRiskRegister(
  fixture: ReturnType<typeof seedWalkthroughAssessment>,
  criterionIds: readonly string[],
) {
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const { saveAssessmentCriterionResponseAction } = await import(
    "./saveAssessmentCriterionResponseAction"
  );
  const { transferAssessmentFindingsToRiskRegisterAction } = await import(
    "./transferAssessmentFindingsToRiskRegisterAction"
  );

  for (const criterionId of criterionIds) {
    await saveAssessmentCriterionResponseAction({
      assessmentId: fixture.assessmentId,
      input: {
        criterionId,
        status: "notOk",
        notes: "Missing guard",
      },
    });
  }
  await transferAssessmentFindingsToRiskRegisterAction({
    assessmentId: fixture.assessmentId,
  });

  const connection = createMigratedDatabase(fixture.databasePath);
  const projection = loadAssessmentRiskRegisterProjection({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
  });
  const transferredRiskEntryIds = Object.fromEntries(
    criterionIds.map((criterionId) => {
      const entry = projection.entries.find(
        (riskRegisterEntry) => riskRegisterEntry.criterionId === criterionId,
      );

      if (!entry) {
        closeDatabase(connection);
        throw new Error("Expected transferred risk entry to exist.");
      }

      return [criterionId, entry.id] as const;
    }),
  );

  closeDatabase(connection);
  return transferredRiskEntryIds;
}

async function transferSecondCriterionRiskEntry(
  fixture: ReturnType<typeof seedWalkthroughAssessment>,
) {
  const transferredRiskEntryIds = await transferCriteriaToRiskRegister(fixture, [
    fixture.secondCriterion.id,
  ]);
  return transferredRiskEntryIds[fixture.secondCriterion.id];
}

test("walkthrough save action persists answers by stable criterion id", async () => {
  const fixture = seedWalkthroughAssessment();
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const { saveAssessmentCriterionResponseAction } = await import(
    "./saveAssessmentCriterionResponseAction"
  );

  const payload = await saveAssessmentCriterionResponseAction({
    assessmentId: fixture.assessmentId,
    input: {
      criterionId: fixture.secondCriterion.id,
      status: "notOk",
      notes: "  Missing guard  ",
    },
  });

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
  const markup = renderWithAppRouter(
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

test("assessment page re-renders with the persisted answer state selected", async () => {
  const fixture = seedWalkthroughAssessment();
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const connection = createMigratedDatabase(fixture.databasePath);
  updateAssessmentFindingResponse({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
    criterionId: fixture.firstCriterion.id,
    status: "notApplicable",
    notes: null,
    updatedAt: new Date("2026-04-11T10:08:00.000Z"),
  });
  closeDatabase(connection);

  const { default: AssessmentPage } = await import(
    "../../app/assessments/[assessmentId]/page"
  );
  const markup = renderWithAppRouter(
    await AssessmentPage({
      params: Promise.resolve({
        assessmentId: fixture.assessmentId,
      }),
    }),
  );

  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp(`data-criterion-id="${fixture.firstCriterion.id}"`),
        '[\\s\\S]*?',
        escapeRegExp('data-answer-value="notApplicable"'),
        '[\\s\\S]*?',
        escapeRegExp('data-selected="true"'),
      ].join(""),
    ),
  );
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp(`data-criterion-id="${fixture.firstCriterion.id}"`),
        '[\\s\\S]*?',
        escapeRegExp('data-selected-answer="notApplicable"'),
      ].join(""),
    ),
  );
});

test("walkthrough transfer action promotes persisted notOk findings into risk entries", async () => {
  const fixture = seedWalkthroughAssessment();
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
      criterionId: fixture.secondCriterion.id,
      status: "notOk",
      notes: "Missing guard",
    },
  });

  const transferResult = await transferAssessmentFindingsToRiskRegisterAction({
    assessmentId: fixture.assessmentId,
  });

  assert.deepEqual(transferResult, {
    assessmentId: fixture.assessmentId,
    eligibleFindingCount: 1,
    createdRiskEntryCount: 1,
    existingRiskEntryCount: 0,
  });

  const connection = createMigratedDatabase(fixture.databasePath);
  const readModel = loadAssessmentReadModel({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
  });
  const transferredCriterion = readModel.sections
    .flatMap((section) => section.criteria)
    .find((criterion) => criterion.id === fixture.secondCriterion.id);

  assert.ok(transferredCriterion);
  assert.equal(transferredCriterion.response.status, "notOk");
  assert.equal(transferredCriterion.riskEntryStatus, "present");
  closeDatabase(connection);

  const { default: AssessmentPage } = await import(
    "../../app/assessments/[assessmentId]/page"
  );
  const markup = renderWithAppRouter(
    await AssessmentPage({
      params: Promise.resolve({
        assessmentId: fixture.assessmentId,
      }),
    }),
  );

  assert.match(markup, /Transfer to risk register/);
  assert.match(markup, /All eligible findings transferred/);
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp(`data-criterion-id="${fixture.secondCriterion.id}"`),
        '[\\s\\S]*?',
        escapeRegExp('data-transfer-state="present"'),
        '[\\s\\S]*?',
        escapeRegExp("Transferred"),
      ].join(""),
    ),
  );
});

test("assessment page renders transferred risk-entry editing and resumes saved classification fields", async () => {
  const fixture = seedWalkthroughAssessment();
  const riskEntryId = await transferSecondCriterionRiskEntry(fixture);
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const { saveAssessmentRiskEntryAction } = await import(
    "./saveAssessmentRiskEntryAction"
  );

  await saveAssessmentRiskEntryAction({
    assessmentId: fixture.assessmentId,
    input: {
      riskEntryId,
      hazard: "Table saw without guard",
      healthEffects: "Hand injury",
      whoAtRisk: "Students and staff",
      likelihood: 2,
      consequence: 3,
      currentControls: "Safety signage",
      proposedAction: "Install a replacement guard",
      costEstimate: 25000,
      responsibleOwner: "Workshop lead",
      dueDate: "2026-04-20",
      completedAt: "2026-04-22",
    },
  });

  const { default: AssessmentPage } = await import(
    "../../app/assessments/[assessmentId]/page"
  );
  const markup = renderWithAppRouter(
    await AssessmentPage({
      params: Promise.resolve({
        assessmentId: fixture.assessmentId,
      }),
    }),
  );

  assert.match(markup, /Risk register/);
  assert.match(
    markup,
    new RegExp(escapeRegExp(`data-risk-entry-id="${riskEntryId}"`)),
  );
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp(`data-risk-entry-id="${riskEntryId}"`),
        '[\\s\\S]*?',
        escapeRegExp('data-risk-level="high"'),
      ].join(""),
    ),
  );
  assert.match(markup, new RegExp(escapeRegExp("Table saw without guard")));
  assert.match(markup, new RegExp(escapeRegExp("Students and staff")));
  assert.match(markup, new RegExp(escapeRegExp("Install a replacement guard")));
  assert.match(markup, /Saved classification: High\./);
});

test("assessment page localizes stale risk classifications to the affected card", async () => {
  const fixture = seedWalkthroughAssessment();
  const transferredRiskEntryIds = await transferCriteriaToRiskRegister(fixture, [
    fixture.firstCriterion.id,
    fixture.secondCriterion.id,
  ]);
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const { saveAssessmentRiskEntryAction } = await import(
    "./saveAssessmentRiskEntryAction"
  );

  await saveAssessmentRiskEntryAction({
    assessmentId: fixture.assessmentId,
    input: {
      riskEntryId: transferredRiskEntryIds[fixture.secondCriterion.id],
      hazard: "Table saw without guard",
      likelihood: 2,
      consequence: 3,
    },
  });

  const connection = createMigratedDatabase(fixture.databasePath);
  connection.sqlite
    .prepare(`
      update risk_entry
      set likelihood = ?, consequence = ?, risk_level = ?
      where id = ?
    `)
    .run(1, 1, "high", transferredRiskEntryIds[fixture.firstCriterion.id]);
  closeDatabase(connection);

  const { default: AssessmentPage } = await import(
    "../../app/assessments/[assessmentId]/page"
  );
  const markup = renderWithAppRouter(
    await AssessmentPage({
      params: Promise.resolve({
        assessmentId: fixture.assessmentId,
      }),
    }),
  );

  assert.match(markup, /Risk register/);
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp(
          `data-risk-entry-id="${transferredRiskEntryIds[fixture.firstCriterion.id]}"`,
        ),
        '[\\s\\S]*?',
        escapeRegExp('data-classification-state="staleRiskLevel"'),
      ].join(""),
    ),
  );
  assert.match(markup, /Save this entry to repair it\./);
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp(
          `data-risk-entry-id="${transferredRiskEntryIds[fixture.secondCriterion.id]}"`,
        ),
        '[\\s\\S]*?',
        escapeRegExp('data-risk-level="high"'),
      ].join(""),
    ),
  );
});

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderWithAppRouter(element: React.ReactElement): string {
  return renderToStaticMarkup(
    React.createElement(
      AppRouterContext.Provider,
      {
        value: appRouterStub,
      },
      element,
    ),
  );
}
