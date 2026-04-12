import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { getRiskMatrixBySlug, getSeedChecklistBySlug } from "@vardi/checklists";
import {
  closeDatabase,
  createBootstrappedDatabase,
  createWorkplaceAssessment,
  updateAssessmentFindingResponse,
} from "@vardi/db/testing";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { loadAssessmentProgressionProjection } from "./loadAssessmentProgressionProjection";
import { loadAssessmentReadModel } from "./loadAssessmentReadModel";
import { loadAssessmentRiskRegisterProjection } from "./loadAssessmentRiskRegisterProjection";
import { loadAssessmentSummaryProjection } from "./loadAssessmentSummaryProjection";

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

  const connection = createBootstrappedDatabase(databasePath);
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

  const connection = createBootstrappedDatabase(fixture.databasePath);
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

function markAllFindingsOk(
  fixture: ReturnType<typeof seedWalkthroughAssessment>,
) {
  const connection = createBootstrappedDatabase(fixture.databasePath);
  connection.sqlite
    .prepare(`
      update finding
      set status = ?, notes = ?, notes_language = ?, updated_at = ?
      where assessment_id = ?
    `)
    .run(
      "ok",
      null,
      null,
      new Date("2026-04-11T10:09:00.000Z").getTime(),
      fixture.assessmentId,
    );
  closeDatabase(connection);
}

function loadAssessmentSurfaceProjections(
  fixture: ReturnType<typeof seedWalkthroughAssessment>,
) {
  const connection = createBootstrappedDatabase(fixture.databasePath);
  const readModel = loadAssessmentReadModel({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
  });
  const riskRegisterProjection = loadAssessmentRiskRegisterProjection({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
    readModel,
  });
  const summaryProjection = loadAssessmentSummaryProjection({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
    riskRegisterProjection,
  });
  const progression = loadAssessmentProgressionProjection({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
    readModel,
    riskRegisterProjection,
    summaryProjection,
  });

  return {
    connection,
    progression,
    readModel,
    riskRegisterProjection,
    summaryProjection,
  };
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

  const connection = createBootstrappedDatabase(fixture.databasePath);
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

  const connection = createBootstrappedDatabase(fixture.databasePath);
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
  assert.match(markup, /Svör vistast strax/);
});

test("assessment page re-renders with the persisted answer state selected", async () => {
  const fixture = seedWalkthroughAssessment();
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const connection = createBootstrappedDatabase(fixture.databasePath);
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

  const connection = createBootstrappedDatabase(fixture.databasePath);
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

  assert.match(markup, new RegExp(escapeRegExp("Færa í áhættuskrá")));
  assert.match(markup, new RegExp(escapeRegExp("Öll hæf atriði færð")));
  assert.match(markup, new RegExp(escapeRegExp("Mótvægisaðgerðir")));
  assert.match(
    markup,
    new RegExp(escapeRegExp("Engar vistaðar mótvægisaðgerðir enn.")),
  );
  assert.doesNotMatch(markup, /Draft action/);
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp(`data-criterion-id="${fixture.secondCriterion.id}"`),
        '[\\s\\S]*?',
        escapeRegExp('data-transfer-state="present"'),
        '[\\s\\S]*?',
        escapeRegExp("Fært"),
      ].join(""),
    ),
  );
});

test("assessment page renders transferred risk-entry editing and resumes saved classification fields", async () => {
  const fixture = seedWalkthroughAssessment();
  const riskEntryId = await transferSecondCriterionRiskEntry(fixture);
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const { createAssessmentRiskMitigationActionAction } = await import(
    "./createAssessmentRiskMitigationActionAction"
  );
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
      classificationReasoning:
        "Students use this saw every day and the missing guard can cause severe injury.",
      currentControls: "Safety signage",
      costEstimate: 25000,
    },
  });

  await createAssessmentRiskMitigationActionAction({
    assessmentId: fixture.assessmentId,
    input: {
      riskEntryId,
      description: "Install a replacement guard",
      assigneeName: "Workshop lead",
      dueDate: "2026-04-20",
      status: "open",
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

  assert.match(markup, new RegExp(escapeRegExp("Áhættuskrá")));
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
  assert.match(
    markup,
    new RegExp(
      escapeRegExp(
        "Students use this saw every day and the missing guard can cause severe injury.",
      ),
    ),
  );
  assert.match(markup, new RegExp(escapeRegExp("Mótvægisaðgerðir")));
  assert.match(markup, new RegExp(escapeRegExp("Install a replacement guard")));
  assert.match(markup, new RegExp(escapeRegExp("Workshop lead")));
  assert.match(markup, new RegExp(escapeRegExp("Alvarleikaval")));
  assert.match(markup, new RegExp(escapeRegExp("Lág")));
  assert.match(markup, new RegExp(escapeRegExp("Miðlungs")));
  assert.match(markup, new RegExp(escapeRegExp("Há")));
  assert.match(markup, new RegExp(escapeRegExp("Líkur 2 · Afleiðing 3")));
  assert.match(markup, new RegExp(escapeRegExp("Vistaður alvarleiki: Há.")));
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp('id="assessment-step-summary"'),
        "[\\s\\S]*?",
        escapeRegExp('data-risk-level="high"'),
        "[\\s\\S]*?",
        escapeRegExp(">Há<"),
      ].join(""),
    ),
  );
  assert.match(markup, new RegExp(escapeRegExp("Aðgerð 1 · vistuð")));
  assert.match(markup, new RegExp(escapeRegExp("Vistuð staða aðgerðar: Opin.")));
});

test("risk register and summary editors localize grouped severity choices in English", async () => {
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
      likelihood: 2,
      consequence: 3,
      classificationReasoning:
        "Students use this saw every day and the missing guard can cause severe injury.",
    },
  });

  const { AssessmentProgressionProvider } = await import(
    "../../app/assessments/[assessmentId]/_components/AssessmentProgressionContext"
  );
  const { RiskRegisterEditor } = await import(
    "../../app/assessments/[assessmentId]/_components/RiskRegisterEditor"
  );
  const { AssessmentSummaryEditor } = await import(
    "../../app/assessments/[assessmentId]/_components/AssessmentSummaryEditor"
  );
  const {
    connection,
    progression,
    readModel,
    riskRegisterProjection,
    summaryProjection,
  } = loadAssessmentSurfaceProjections(fixture);
  const markup = renderWithAppRouter(
    React.createElement(
      AssessmentProgressionProvider,
      {
        assessmentId: fixture.assessmentId,
        children: [
          React.createElement(RiskRegisterEditor, {
            assessmentId: fixture.assessmentId,
            entries: riskRegisterProjection.entries,
            key: "risk-register",
            language: "en",
            riskMatrixSeverityChoices:
              riskRegisterProjection.riskMatrix.severityChoices,
            riskMatrixTitle: readModel.riskMatrix.translations.is.title,
          }),
          React.createElement(AssessmentSummaryEditor, {
            assessmentId: fixture.assessmentId,
            key: "summary",
            language: "en",
            prioritizedEntries: summaryProjection.prioritizedEntries,
            summary: summaryProjection.summary,
          }),
        ],
        initialProgression: progression,
      },
    ),
  );

  closeDatabase(connection);

  assert.match(markup, new RegExp(escapeRegExp("Severity choice")));
  assert.match(markup, new RegExp(escapeRegExp("Low")));
  assert.match(markup, new RegExp(escapeRegExp("Medium")));
  assert.match(markup, new RegExp(escapeRegExp("High")));
  assert.match(
    markup,
    new RegExp(escapeRegExp("Likelihood 2 · Consequence 3")),
  );
  assert.match(markup, new RegExp(escapeRegExp("Saved severity: High.")));
  assert.match(markup, new RegExp(escapeRegExp("Risk entries by severity")));
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp('data-risk-level="high"'),
        "[\\s\\S]*?",
        escapeRegExp(">High<"),
      ].join(""),
    ),
  );
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

  const connection = createBootstrappedDatabase(fixture.databasePath);
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

  assert.match(markup, new RegExp(escapeRegExp("Áhættuskrá")));
  assert.match(
    markup,
    new RegExp(
      [
        "<article[^>]*(",
        [
          escapeRegExp(
            `data-risk-entry-id="${transferredRiskEntryIds[fixture.firstCriterion.id]}"`,
          ),
          "[^>]*",
          escapeRegExp('data-classification-state="staleRiskLevel"'),
        ].join(""),
        "|",
        [
          escapeRegExp('data-classification-state="staleRiskLevel"'),
          "[^>]*",
          escapeRegExp(
            `data-risk-entry-id="${transferredRiskEntryIds[fixture.firstCriterion.id]}"`,
          ),
        ].join(""),
        ")",
      ].join(""),
    ),
  );
  assert.match(
    markup,
    new RegExp(
      escapeRegExp(
        "Vistaður alvarleiki er úreltur. Vistaðu færsluna til að laga það.",
      ),
    ),
  );
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

test("assessment page renders the summary editor with workplace defaults and readiness blockers", async () => {
  const fixture = seedWalkthroughAssessment();
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

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

  assert.match(markup, /Samantekt og útflutningsstaða/);
  assert.match(markup, /data-summary-readiness="blocked"/);
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp('data-summary-field="companyName"'),
        '[\\s\\S]*?',
        escapeRegExp('value="FB workshop"'),
      ].join(""),
    ),
  );
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp('data-summary-field="location"'),
        '[\\s\\S]*?',
        escapeRegExp('value="Austurberg 5"'),
      ].join(""),
    ),
  );
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp('data-summary-field="assessmentDate"'),
        '[\\s\\S]*?',
        escapeRegExp('value="2026-04-11"'),
      ].join(""),
    ),
  );
  assert.match(markup, /Það vantar svör fyrir/);
  assert.match(markup, /Samantekt vantar enn vistuð gildi fyrir/);
  assert.match(markup, /Ljúktu fyrst við hindranirnar hér að ofan áður en útflutningur opnast\./);
  assert.match(markup, /Sækja Word \+ PDF pakka/);
  assert.match(markup, /data-export-button-state="idle"/);
});

test("assessment page renders progression navigation and keeps blocked later steps visible from persisted state", async () => {
  const fixture = seedWalkthroughAssessment();
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

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

  assert.match(markup, /data-assessment-current-step="walkthrough"/);
  assert.match(
    markup,
    /<a[^>]*data-progression-current="true"[^>]*data-progression-step-id="walkthrough"[^>]*>/,
  );
  assert.match(
    markup,
    /<a[^>]*data-progression-availability="blocked"[^>]*data-progression-step-id="riskRegister"[^>]*>/,
  );
  assert.match(
    markup,
    /<a[^>]*data-progression-availability="blocked"[^>]*data-progression-step-id="summary"[^>]*>/,
  );
  assert.match(
    markup,
    /<a[^>]*data-progression-availability="blocked"[^>]*data-progression-step-id="export"[^>]*>/,
  );
  assert.match(
    markup,
    /<section[^>]*data-step-availability="blocked"[^>]*id="assessment-step-riskRegister"[^>]*>/,
  );
  assert.match(
    markup,
    /<section[^>]*data-step-availability="blocked"[^>]*id="assessment-step-summary"[^>]*>/,
  );
  assert.match(
    markup,
    /<section[^>]*data-step-availability="blocked"[^>]*id="assessment-step-export"[^>]*>/,
  );
});

test("summary save round-trip persists the final summary and flips export readiness after the persisted flow is complete", async () => {
  const fixture = seedWalkthroughAssessment();
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  markAllFindingsOk(fixture);

  const riskEntryId = await transferSecondCriterionRiskEntry(fixture);

  const { saveAssessmentRiskEntryAction } = await import(
    "./saveAssessmentRiskEntryAction"
  );
  const { saveAssessmentSummaryAction } = await import(
    "./saveAssessmentSummaryAction"
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
      costEstimate: 25000,
    },
  });

  await saveAssessmentSummaryAction({
    assessmentId: fixture.assessmentId,
    input: {
      companyName: "  FB workshop  ",
      location: "  Austurberg 5  ",
      assessmentDate: "2026-04-20",
      participants: "  Student assessor  ",
      method: "  Walkthrough  ",
      notes: "  Prioritize guarding and dust extraction first.  ",
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

  assert.match(markup, /data-summary-readiness="ready"/);
  assert.match(markup, /Útflutningsstaða tilbúin/);
  assert.match(markup, /Allar vistaðar forsendur eru tilbúnar/);
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp('data-summary-field="participants"'),
        '[\\s\\S]*?',
        escapeRegExp('value="Student assessor"'),
      ].join(""),
    ),
  );
  assert.match(markup, /Prioritize guarding and dust extraction first\./);
  assert.match(
    markup,
    new RegExp(
      [
        escapeRegExp('data-summary-field="assessmentDate"'),
        '[\\s\\S]*?',
        escapeRegExp('value="2026-04-20"'),
      ].join(""),
    ),
  );
  assert.match(markup, /Sækja Word \+ PDF pakka/);
  assert.match(
    markup,
    /Útflutningur notar vistaðan gátlista, áhættuskrá og samantektargildi\./,
  );
});

test("assessment page keeps later persisted data visible while walkthrough regression re-blocks guidance", async () => {
  const fixture = seedWalkthroughAssessment();
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  markAllFindingsOk(fixture);

  const riskEntryId = await transferSecondCriterionRiskEntry(fixture);
  const { saveAssessmentRiskEntryAction } = await import(
    "./saveAssessmentRiskEntryAction"
  );
  const { saveAssessmentSummaryAction } = await import(
    "./saveAssessmentSummaryAction"
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
      costEstimate: 25000,
    },
  });

  await saveAssessmentSummaryAction({
    assessmentId: fixture.assessmentId,
    input: {
      companyName: "FB workshop",
      location: "Austurberg 5",
      assessmentDate: "2026-04-20",
      participants: "Student assessor",
      method: "Walkthrough",
      notes: "Prioritize guarding and dust extraction first.",
    },
  });

  const connection = createBootstrappedDatabase(fixture.databasePath);
  connection.sqlite
    .prepare(`
      update finding
      set status = ?, notes = ?, updated_at = ?
      where owner_id = ? and assessment_id = ? and criterion_id = ?
    `)
    .run(
      "unanswered",
      null,
      new Date("2026-04-11T10:20:00.000Z").getTime(),
      "owner-1",
      fixture.assessmentId,
      fixture.secondCriterion.id,
    );
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

  assert.match(markup, /data-assessment-current-step="walkthrough"/);
  assert.match(
    markup,
    /<section[^>]*data-step-availability="blocked"[^>]*data-step-completion="complete"[^>]*id="assessment-step-riskRegister"[^>]*>/,
  );
  assert.match(
    markup,
    /<section[^>]*data-step-availability="blocked"[^>]*data-step-completion="complete"[^>]*id="assessment-step-summary"[^>]*>/,
  );
  assert.match(
    markup,
    /<section[^>]*data-step-availability="blocked"[^>]*data-step-completion="inProgress"[^>]*id="assessment-step-export"[^>]*>/,
  );
  assert.match(markup, /Table saw without guard/);
  assert.match(markup, /Prioritize guarding and dust extraction first\./);
  assert.match(markup, /Vistað efni helst sýnilegt á meðan\./);
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
