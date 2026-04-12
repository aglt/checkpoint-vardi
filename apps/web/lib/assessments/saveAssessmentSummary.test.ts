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
} from "@vardi/db/testing";

import {
  SaveAssessmentSummaryError,
  saveAssessmentSummary,
} from "./saveAssessmentSummary";

const startedAt = new Date("2026-04-12T10:00:00.000Z");
const updatedAt = new Date("2026-04-12T10:05:00.000Z");

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

function seedSummaryAssessmentFixture() {
  const databasePath = join(
    mkdtempSync(join(tmpdir(), "vardi-s1-07-summary-")),
    "checkpoint-vardi.db",
  );
  const checklist = getRequiredChecklist();
  const riskMatrix = getRequiredRiskMatrix();
  const firstCriterion = checklist.sections[0]?.criteria[0];

  if (!firstCriterion) {
    throw new Error("Expected checklist fixture to contain at least one criterion.");
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
    databasePath,
    assessmentId: assessment.assessmentId,
    firstCriterion,
  };
}

test("saveAssessmentSummaryAction upserts normalized summary values and returns export-ready status from persisted state", async () => {
  const fixture = seedSummaryAssessmentFixture();
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const connection = createMigratedDatabase(fixture.databasePath);
  connection.sqlite
    .prepare(`
      update finding
      set status = ?, notes = ?, notes_language = ?, updated_at = ?
      where assessment_id = ?
    `)
    .run("ok", null, null, updatedAt.getTime(), fixture.assessmentId);

  connection.sqlite
    .prepare(`
      update finding
      set status = ?, notes = ?, notes_language = ?, updated_at = ?
      where assessment_id = ? and criterion_id = ?
    `)
    .run(
      "notOk",
      "Needs follow-up",
      null,
      updatedAt.getTime(),
      fixture.assessmentId,
      fixture.firstCriterion.id,
    );

  const firstFinding = connection.sqlite
    .prepare(`
      select id
      from finding
      where assessment_id = ? and criterion_id = ?
    `)
    .get(fixture.assessmentId, fixture.firstCriterion.id) as
    | { id: string }
    | undefined;

  if (!firstFinding) {
    closeDatabase(connection);
    throw new Error("Expected first finding to exist.");
  }

  connection.sqlite
    .prepare(`
      insert into risk_entry (
        id,
        owner_id,
        finding_id,
        hazard,
        health_effects,
        who_at_risk,
        likelihood,
        consequence,
        risk_level,
        current_controls,
        proposed_action,
        control_hierarchy,
        cost_estimate,
        responsible_owner,
        due_date,
        completed_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      "risk-entry-1",
      "owner-1",
      firstFinding.id,
      "Table saw without guard",
      null,
      null,
      2,
      3,
      "high",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    );
  closeDatabase(connection);

  const { saveAssessmentSummaryAction } = await import(
    "./saveAssessmentSummaryAction"
  );

  const output = await saveAssessmentSummaryAction({
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

  assert.deepEqual(output, {
    assessmentId: fixture.assessmentId,
    companyName: "FB workshop",
    location: "Austurberg 5",
    assessmentDate: "2026-04-20",
    participants: "Student assessor",
    method: "Walkthrough",
    notes: "Prioritize guarding and dust extraction first.",
    readiness: {
      exportReady: true,
      walkthrough: {
        ready: true,
        unansweredCriterionCount: 0,
      },
      transfer: {
        ready: true,
        eligibleFindingCount: 1,
        missingRiskEntryCount: 0,
      },
      classification: {
        ready: true,
        transferredRiskEntryCount: 1,
        unclassifiedRiskEntryCount: 0,
        staleRiskEntryCount: 0,
        invalidRiskEntryCount: 0,
      },
      summary: {
        ready: true,
        missingFields: [],
      },
    },
  });

  const persistedConnection = createMigratedDatabase(fixture.databasePath);
  const aggregate = loadAssessmentAggregate({
    db: persistedConnection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
  });

  assert.equal(aggregate.summary?.companyName, "FB workshop");
  assert.equal(aggregate.summary?.location, "Austurberg 5");
  assert.equal(aggregate.summary?.participants, "Student assessor");
  assert.equal(aggregate.summary?.method, "Walkthrough");
  assert.equal(
    aggregate.summary?.assessmentDate?.toISOString().slice(0, 10),
    "2026-04-20",
  );

  closeDatabase(persistedConnection);
});

test("saveAssessmentSummary returns client-safe validation and missing-assessment errors", () => {
  const fixture = seedSummaryAssessmentFixture();
  const connection = createMigratedDatabase(fixture.databasePath);

  assert.throws(
    () =>
      saveAssessmentSummary({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: fixture.assessmentId,
        input: {
          companyName: "FB workshop",
          location: "Austurberg 5",
          assessmentDate: "2026/04/20",
          participants: "Assessor",
          method: "Walkthrough",
          notes: "Summary",
        },
      }),
    (error: unknown) =>
      error instanceof SaveAssessmentSummaryError &&
      error.status === 400 &&
      error.code === "invalid-summary-save-request" &&
      Array.isArray(error.fieldErrors?.assessmentDate),
  );

  assert.throws(
    () =>
      saveAssessmentSummary({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "missing-assessment",
        input: {
          companyName: "FB workshop",
          location: "Austurberg 5",
          assessmentDate: "2026-04-20",
          participants: "Assessor",
          method: "Walkthrough",
          notes: "Summary",
        },
      }),
    (error: unknown) =>
      error instanceof SaveAssessmentSummaryError &&
      error.status === 404 &&
      error.code === "assessment-not-found",
  );

  closeDatabase(connection);
});
