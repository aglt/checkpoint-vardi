import assert from "node:assert/strict";
import test from "node:test";

import { getRiskMatrixBySlug, getSeedChecklistBySlug } from "@vardi/checklists";
import {
  assessmentSummary,
  closeDatabase,
  createBootstrappedDatabase,
  createWorkplaceAssessment,
  finding,
  riskEntry,
  updateAssessmentFindingResponse,
} from "@vardi/db/testing";

import { loadAssessmentProgressionProjection } from "./loadAssessmentProgressionProjection";
import { loadAssessmentSummaryProjection } from "./loadAssessmentSummaryProjection";

const OWNER_ID = "owner-1";
const startedAt = new Date("2026-04-12T10:00:00.000Z");
const updatedAt = new Date("2026-04-12T10:05:00.000Z");
const assessmentDate = new Date("2026-04-20T00:00:00.000Z");

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

function seedAssessmentFixture() {
  const connection = createBootstrappedDatabase();
  const checklist = getRequiredChecklist();
  const riskMatrix = getRequiredRiskMatrix();
  const criteria = checklist.sections.flatMap((section) => section.criteria);
  const assessment = createWorkplaceAssessment({
    db: connection.db,
    ownerId: OWNER_ID,
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
    criterionIds: criteria.map((criterion) => criterion.id),
  });

  return {
    connection,
    assessmentId: assessment.assessmentId,
    criteria,
    firstCriterion: criteria[0]!,
    secondCriterion: criteria[1]!,
  };
}

function updateCriterionStatus(
  fixture: ReturnType<typeof seedAssessmentFixture>,
  params: {
    readonly criterionId: string;
    readonly status: "ok" | "notOk" | "notApplicable";
    readonly notes?: string | null;
  },
) {
  updateAssessmentFindingResponse({
    db: fixture.connection.db,
    ownerId: OWNER_ID,
    assessmentId: fixture.assessmentId,
    criterionId: params.criterionId,
    status: params.status,
    notes: params.notes ?? null,
    updatedAt,
  });
}

function reopenCriterionAsUnanswered(
  fixture: ReturnType<typeof seedAssessmentFixture>,
  criterionId: string,
) {
  fixture.connection.sqlite
    .prepare(`
      update finding
      set status = ?, notes = ?, updated_at = ?
      where owner_id = ? and assessment_id = ? and criterion_id = ?
    `)
    .run(
      "unanswered",
      null,
      updatedAt.getTime(),
      OWNER_ID,
      fixture.assessmentId,
      criterionId,
    );
}

function markAllCriteria(
  fixture: ReturnType<typeof seedAssessmentFixture>,
  status: "ok" | "notApplicable",
) {
  for (const criterion of fixture.criteria) {
    updateCriterionStatus(fixture, {
      criterionId: criterion.id,
      status,
      notes: null,
    });
  }
}

function getFindingIdByCriterionId(
  fixture: ReturnType<typeof seedAssessmentFixture>,
  criterionId: string,
) {
  const row = fixture.connection.db
    .select({
      id: finding.id,
      assessmentId: finding.assessmentId,
      criterionId: finding.criterionId,
    })
    .from(finding)
    .all()
    .find(
      (candidate) =>
        candidate.assessmentId === fixture.assessmentId &&
        candidate.criterionId === criterionId,
    );

  if (!row?.id) {
    throw new Error("Expected finding row to exist for criterion.");
  }

  return row.id;
}

function insertRiskEntry(
  fixture: ReturnType<typeof seedAssessmentFixture>,
  params: {
    readonly id: string;
    readonly criterionId: string;
    readonly hazard: string;
    readonly likelihood: number | null;
    readonly consequence: number | null;
    readonly riskLevel: "low" | "medium" | "high" | null;
  },
) {
  fixture.connection.db.insert(riskEntry).values({
    id: params.id,
    ownerId: OWNER_ID,
    findingId: getFindingIdByCriterionId(fixture, params.criterionId),
    hazard: params.hazard,
    healthEffects: null,
    whoAtRisk: null,
    likelihood: params.likelihood,
    consequence: params.consequence,
    riskLevel: params.riskLevel,
    currentControls: null,
    controlHierarchy: null,
    costEstimate: null,
  }).run();
}

function saveSummary(
  fixture: ReturnType<typeof seedAssessmentFixture>,
  overrides?: Partial<{
    readonly companyName: string;
    readonly location: string;
    readonly assessmentDate: Date;
    readonly participants: string;
    readonly method: string;
    readonly notes: string;
  }>,
) {
  fixture.connection.db.insert(assessmentSummary).values({
    assessmentId: fixture.assessmentId,
    ownerId: OWNER_ID,
    companyName: overrides?.companyName ?? "FB workshop",
    location: overrides?.location ?? "Austurberg 5",
    assessmentDate: overrides?.assessmentDate ?? assessmentDate,
    participants: overrides?.participants ?? "Assessor",
    method: overrides?.method ?? "Walkthrough",
    notes: overrides?.notes ?? "Prioritize the top hazards first.",
  }).run();
}

function loadProgression(
  fixture: ReturnType<typeof seedAssessmentFixture>,
) {
  return loadAssessmentProgressionProjection({
    db: fixture.connection.db,
    ownerId: OWNER_ID,
    assessmentId: fixture.assessmentId,
  });
}

test("loadAssessmentProgressionProjection makes walkthrough current on a fresh assessment and blocks later steps", () => {
  const fixture = seedAssessmentFixture();

  const progression = loadProgression(fixture);

  assert.equal(progression.currentStepId, "walkthrough");
  assert.equal(progression.walkthrough.completionState, "notStarted");
  assert.equal(progression.walkthrough.metrics.completedCount, 0);
  assert.equal(progression.riskRegister.availability, "blocked");
  assert.equal(progression.riskRegister.blockedByStepId, "walkthrough");
  assert.equal(progression.summary.availability, "blocked");
  assert.equal(progression.summary.blockedByStepId, "walkthrough");
  assert.equal(progression.export.availability, "blocked");
  assert.equal(progression.export.blockedByStepId, "walkthrough");

  closeDatabase(fixture.connection);
});

test("loadAssessmentProgressionProjection auto-completes the risk register when walkthrough answers are fully persisted with zero notOk findings", () => {
  const fixture = seedAssessmentFixture();

  markAllCriteria(fixture, "ok");

  const progression = loadProgression(fixture);

  assert.equal(progression.walkthrough.completionState, "complete");
  assert.equal(progression.riskRegister.completionState, "complete");
  assert.equal(progression.riskRegister.requiredEntryCount, 0);
  assert.equal(progression.riskRegister.metrics.percentage, 100);
  assert.equal(progression.summary.availability, "available");
  assert.equal(progression.summary.completionState, "notStarted");
  assert.equal(progression.currentStepId, "summary");
  assert.equal(progression.export.availability, "blocked");
  assert.equal(progression.export.blockedByStepId, "summary");

  closeDatabase(fixture.connection);
});

test("loadAssessmentProgressionProjection keeps transferred but unclassified rows as the current risk-register work", () => {
  const fixture = seedAssessmentFixture();

  markAllCriteria(fixture, "ok");
  updateCriterionStatus(fixture, {
    criterionId: fixture.firstCriterion.id,
    status: "notOk",
    notes: "Missing guard",
  });
  insertRiskEntry(fixture, {
    id: "risk-entry-unclassified",
    criterionId: fixture.firstCriterion.id,
    hazard: "Missing guard",
    likelihood: null,
    consequence: null,
    riskLevel: null,
  });

  const progression = loadProgression(fixture);

  assert.equal(progression.walkthrough.completionState, "complete");
  assert.equal(progression.currentStepId, "riskRegister");
  assert.equal(progression.riskRegister.completionState, "inProgress");
  assert.equal(progression.riskRegister.requiredEntryCount, 1);
  assert.equal(progression.riskRegister.unclassifiedRiskEntryCount, 1);
  assert.deepEqual(
    progression.riskRegister.blockers.map((blocker) => blocker.code),
    ["riskRegisterUnclassifiedEntries"],
  );
  assert.equal(progression.summary.availability, "blocked");
  assert.equal(progression.summary.blockedByStepId, "riskRegister");
  assert.equal(progression.export.availability, "blocked");
  assert.equal(progression.export.blockedByStepId, "riskRegister");

  closeDatabase(fixture.connection);
});

test("loadAssessmentProgressionProjection keeps prefilled summary defaults out of persisted completion counts", () => {
  const fixture = seedAssessmentFixture();

  markAllCriteria(fixture, "ok");

  const summaryProjection = loadAssessmentSummaryProjection({
    db: fixture.connection.db,
    ownerId: OWNER_ID,
    assessmentId: fixture.assessmentId,
  });
  const progression = loadAssessmentProgressionProjection({
    db: fixture.connection.db,
    ownerId: OWNER_ID,
    assessmentId: fixture.assessmentId,
    summaryProjection,
  });

  assert.equal(summaryProjection.summary.form.companyName, "FB workshop");
  assert.equal(summaryProjection.summary.form.location, "Austurberg 5");
  assert.equal(summaryProjection.summary.form.assessmentDate, "2026-04-12");
  assert.equal(progression.summary.completionState, "notStarted");
  assert.equal(progression.summary.savedFieldCount, 0);
  assert.deepEqual(progression.summary.missingFieldIds, [
    "companyName",
    "location",
    "assessmentDate",
    "participants",
    "method",
    "notes",
  ]);
  assert.equal(progression.exportReadiness.exportReady, false);

  closeDatabase(fixture.connection);
});

test("loadAssessmentProgressionProjection marks every step complete when all required persisted state is present", () => {
  const fixture = seedAssessmentFixture();

  markAllCriteria(fixture, "ok");
  saveSummary(fixture);

  const progression = loadProgression(fixture);

  assert.equal(progression.walkthrough.completionState, "complete");
  assert.equal(progression.riskRegister.completionState, "complete");
  assert.equal(progression.summary.completionState, "complete");
  assert.equal(progression.export.completionState, "complete");
  assert.equal(progression.export.exportReady, true);
  assert.equal(progression.currentStepId, "export");
  assert.equal(progression.completedStepCount, 4);
  assert.equal(progression.progressPercentage, 100);

  closeDatabase(fixture.connection);
});

test("loadAssessmentProgressionProjection re-blocks later steps after walkthrough regression while preserving persisted later-step completion", () => {
  const fixture = seedAssessmentFixture();

  markAllCriteria(fixture, "ok");
  updateCriterionStatus(fixture, {
    criterionId: fixture.firstCriterion.id,
    status: "notOk",
    notes: "Missing guard",
  });
  insertRiskEntry(fixture, {
    id: "risk-entry-ready",
    criterionId: fixture.firstCriterion.id,
    hazard: "Missing guard",
    likelihood: 2,
    consequence: 3,
    riskLevel: "high",
  });
  saveSummary(fixture);
  reopenCriterionAsUnanswered(fixture, fixture.firstCriterion.id);

  const progression = loadProgression(fixture);

  assert.equal(progression.currentStepId, "walkthrough");
  assert.equal(progression.walkthrough.completionState, "inProgress");
  assert.equal(progression.riskRegister.eligibleFindingCount, 0);
  assert.equal(progression.riskRegister.transferredRiskEntryCount, 1);
  assert.equal(progression.riskRegister.requiredEntryCount, 1);
  assert.equal(progression.riskRegister.completionState, "complete");
  assert.equal(progression.riskRegister.availability, "blocked");
  assert.equal(progression.riskRegister.blockedByStepId, "walkthrough");
  assert.equal(progression.summary.completionState, "complete");
  assert.equal(progression.summary.availability, "blocked");
  assert.equal(progression.summary.blockedByStepId, "walkthrough");
  assert.equal(progression.exportReadiness.exportReady, false);
  assert.equal(progression.export.completionState, "inProgress");
  assert.equal(progression.export.availability, "blocked");
  assert.equal(progression.export.blockedByStepId, "walkthrough");

  closeDatabase(fixture.connection);
});

test("loadAssessmentProgressionProjection keeps orphaned transferred rows as real in-progress work after walkthrough regression", () => {
  const fixture = seedAssessmentFixture();

  markAllCriteria(fixture, "ok");
  updateCriterionStatus(fixture, {
    criterionId: fixture.firstCriterion.id,
    status: "notOk",
    notes: "Missing guard",
  });
  insertRiskEntry(fixture, {
    id: "risk-entry-orphaned",
    criterionId: fixture.firstCriterion.id,
    hazard: "Missing guard",
    likelihood: null,
    consequence: null,
    riskLevel: null,
  });
  saveSummary(fixture);
  reopenCriterionAsUnanswered(fixture, fixture.firstCriterion.id);

  const progression = loadProgression(fixture);

  assert.equal(progression.riskRegister.eligibleFindingCount, 0);
  assert.equal(progression.riskRegister.transferredRiskEntryCount, 1);
  assert.equal(progression.riskRegister.requiredEntryCount, 1);
  assert.equal(progression.riskRegister.completionState, "inProgress");
  assert.equal(progression.riskRegister.availability, "blocked");
  assert.deepEqual(
    progression.riskRegister.blockers.map((blocker) => blocker.code),
    ["riskRegisterUnclassifiedEntries"],
  );
  assert.equal(progression.summary.completionState, "complete");
  assert.equal(progression.summary.availability, "blocked");

  closeDatabase(fixture.connection);
});
