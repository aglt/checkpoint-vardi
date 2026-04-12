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
} from "@vardi/db/testing";

import { loadAssessmentSummaryProjection } from "./loadAssessmentSummaryProjection";

const startedAt = new Date("2026-04-12T10:00:00.000Z");
const savedAt = new Date("2026-04-12T10:05:00.000Z");
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
    criterionIds: criteria.map((criterion) => criterion.id),
  });

  return {
    connection,
    checklist,
    assessmentId: assessment.assessmentId,
    firstCriterion: criteria[0]!,
    secondCriterion: criteria[1]!,
    thirdCriterion: criteria[2]!,
  };
}

function markAllCriteriaOk(
  fixture: ReturnType<typeof seedAssessmentFixture>,
) {
  fixture.connection.sqlite
    .prepare(`
      update finding
      set status = ?, notes = ?, notes_language = ?, updated_at = ?
      where assessment_id = ?
    `)
    .run("ok", null, null, savedAt.getTime(), fixture.assessmentId);
}

function markCriteriaNotOk(
  fixture: ReturnType<typeof seedAssessmentFixture>,
  criterionIds: readonly string[],
) {
  for (const criterionId of criterionIds) {
    fixture.connection.sqlite
      .prepare(`
        update finding
        set status = ?, notes = ?, notes_language = ?, updated_at = ?
        where assessment_id = ? and criterion_id = ?
      `)
      .run(
        "notOk",
        "Needs follow-up",
        null,
        savedAt.getTime(),
        fixture.assessmentId,
        criterionId,
      );
  }
}

function getFindingIdsByCriterionId(
  fixture: ReturnType<typeof seedAssessmentFixture>,
  criterionIds: readonly string[],
) {
  return Object.fromEntries(
    fixture.connection.db
      .select({
        id: finding.id,
        criterionId: finding.criterionId,
      })
      .from(finding)
      .all()
      .filter(
        (row) =>
          criterionIds.includes(row.criterionId) &&
          row.id.length > 0 &&
          row.criterionId.length > 0,
      )
      .map((row) => [row.criterionId, row.id] as const),
  );
}

test("loadAssessmentSummaryProjection prefills workplace defaults and reports blocked readiness", () => {
  const fixture = seedAssessmentFixture();

  markCriteriaNotOk(fixture, [fixture.firstCriterion.id]);

  const projection = loadAssessmentSummaryProjection({
    db: fixture.connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
  });

  assert.equal(projection.summary.form.companyName, "FB workshop");
  assert.equal(projection.summary.form.location, "Austurberg 5");
  assert.equal(projection.summary.form.assessmentDate, "2026-04-12");
  assert.equal(projection.prioritizedEntries.length, 0);
  assert.equal(projection.readiness.exportReady, false);
  assert.equal(projection.readiness.walkthrough.ready, false);
  assert.ok(projection.readiness.walkthrough.unansweredCriterionCount > 0);
  assert.equal(projection.readiness.transfer.ready, false);
  assert.equal(projection.readiness.transfer.eligibleFindingCount, 1);
  assert.equal(projection.readiness.transfer.missingRiskEntryCount, 1);
  assert.equal(projection.readiness.classification.ready, true);
  assert.deepEqual(projection.readiness.summary.missingFields, [
    "companyName",
    "location",
    "assessmentDate",
    "participants",
    "method",
    "notes",
  ]);

  closeDatabase(fixture.connection);
});

test("loadAssessmentSummaryProjection localizes stale, invalid, and unclassified risk rows to readiness counts", () => {
  const fixture = seedAssessmentFixture();

  markAllCriteriaOk(fixture);
  markCriteriaNotOk(fixture, [
    fixture.firstCriterion.id,
    fixture.secondCriterion.id,
    fixture.thirdCriterion.id,
  ]);

  const findingIds = getFindingIdsByCriterionId(fixture, [
    fixture.firstCriterion.id,
    fixture.secondCriterion.id,
    fixture.thirdCriterion.id,
  ]);

  fixture.connection.db.insert(riskEntry).values([
    {
      id: "risk-entry-stale",
      ownerId: "owner-1",
      findingId: findingIds[fixture.firstCriterion.id],
      hazard: "Stale row",
      healthEffects: null,
      whoAtRisk: null,
      likelihood: 1,
      consequence: 1,
      riskLevel: "high",
      currentControls: null,
      controlHierarchy: null,
      costEstimate: null,
    },
    {
      id: "risk-entry-invalid",
      ownerId: "owner-1",
      findingId: findingIds[fixture.secondCriterion.id],
      hazard: "Invalid row",
      healthEffects: null,
      whoAtRisk: null,
      likelihood: 99,
      consequence: 1,
      riskLevel: "low",
      currentControls: null,
      controlHierarchy: null,
      costEstimate: null,
    },
    {
      id: "risk-entry-unclassified",
      ownerId: "owner-1",
      findingId: findingIds[fixture.thirdCriterion.id],
      hazard: "Needs scoring",
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

  fixture.connection.db.insert(assessmentSummary).values({
    assessmentId: fixture.assessmentId,
    ownerId: "owner-1",
    companyName: "FB workshop",
    location: "Austurberg 5",
    assessmentDate,
    participants: "Assessor",
    method: "Walkthrough",
    notes: "Prioritize the top hazards.",
  }).run();

  const projection = loadAssessmentSummaryProjection({
    db: fixture.connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
  });

  assert.equal(projection.readiness.walkthrough.ready, true);
  assert.equal(projection.readiness.transfer.ready, true);
  assert.equal(projection.readiness.classification.ready, false);
  assert.equal(projection.readiness.classification.transferredRiskEntryCount, 3);
  assert.equal(projection.readiness.classification.staleRiskEntryCount, 1);
  assert.equal(projection.readiness.classification.invalidRiskEntryCount, 1);
  assert.equal(
    projection.readiness.classification.unclassifiedRiskEntryCount,
    1,
  );
  assert.equal(projection.readiness.summary.ready, true);
  assert.equal(projection.readiness.exportReady, false);

  closeDatabase(fixture.connection);
});

test("loadAssessmentSummaryProjection orders prioritized entries by verified severity and reports export-ready state", () => {
  const fixture = seedAssessmentFixture();

  markAllCriteriaOk(fixture);
  markCriteriaNotOk(fixture, [
    fixture.firstCriterion.id,
    fixture.secondCriterion.id,
  ]);

  const findingIds = getFindingIdsByCriterionId(fixture, [
    fixture.firstCriterion.id,
    fixture.secondCriterion.id,
  ]);

  fixture.connection.db.insert(riskEntry).values([
    {
      id: "risk-entry-low",
      ownerId: "owner-1",
      findingId: findingIds[fixture.firstCriterion.id],
      hazard: "Low priority row",
      healthEffects: null,
      whoAtRisk: null,
      likelihood: 1,
      consequence: 1,
      riskLevel: "low",
      currentControls: null,
      controlHierarchy: null,
      costEstimate: null,
    },
    {
      id: "risk-entry-high",
      ownerId: "owner-1",
      findingId: findingIds[fixture.secondCriterion.id],
      hazard: "High priority row",
      healthEffects: null,
      whoAtRisk: null,
      likelihood: 2,
      consequence: 3,
      riskLevel: "high",
      currentControls: null,
      controlHierarchy: null,
      costEstimate: null,
    },
  ]).run();

  fixture.connection.db.insert(assessmentSummary).values({
    assessmentId: fixture.assessmentId,
    ownerId: "owner-1",
    companyName: "FB workshop",
    location: "Austurberg 5",
    assessmentDate,
    participants: "Assessor",
    method: "Walkthrough",
    notes: "Prioritize the high-level hazards first.",
  }).run();

  const projection = loadAssessmentSummaryProjection({
    db: fixture.connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
  });

  assert.deepEqual(
    projection.prioritizedEntries.map((entry) => ({
      id: entry.id,
      hazard: entry.hazard,
      savedRiskLevel: entry.savedRiskLevel,
    })),
    [
      {
        id: "risk-entry-high",
        hazard: "High priority row",
        savedRiskLevel: "high",
      },
      {
        id: "risk-entry-low",
        hazard: "Low priority row",
        savedRiskLevel: "low",
      },
    ],
  );
  assert.equal(projection.readiness.walkthrough.ready, true);
  assert.equal(projection.readiness.transfer.ready, true);
  assert.equal(projection.readiness.classification.ready, true);
  assert.equal(projection.readiness.summary.ready, true);
  assert.equal(projection.readiness.exportReady, true);

  closeDatabase(fixture.connection);
});
