import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { getRiskMatrixBySlug, getSeedChecklistBySlug } from "@vardi/checklists";
import {
  assessmentSummary,
  closeDatabase,
  createMigratedDatabase,
  createWorkplaceAssessment,
  riskEntry,
} from "@vardi/db/testing";

import { buildAssessmentExportDocuments } from "./buildAssessmentExportDocuments";
import {
  GenerateAssessmentExportBundleError,
  generateAssessmentExportBundle,
} from "./generateAssessmentExportBundle";
import { loadAssessmentReadModel } from "./loadAssessmentReadModel";
import { loadAssessmentRiskRegisterProjection } from "./loadAssessmentRiskRegisterProjection";
import { loadAssessmentSummaryProjection } from "./loadAssessmentSummaryProjection";

const startedAt = new Date("2026-04-12T10:00:00.000Z");
const updatedAt = new Date("2026-04-12T10:10:00.000Z");

function getRequiredChecklist() {
  const checklist = getSeedChecklistBySlug("construction-site");

  if (!checklist) {
    throw new Error("Expected seeded construction checklist fixture to exist.");
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

function seedExportAssessmentFixture() {
  const databasePath = join(
    mkdtempSync(join(tmpdir(), "vardi-s1-08-export-")),
    "checkpoint-vardi.db",
  );
  const checklist = getRequiredChecklist();
  const riskMatrix = getRequiredRiskMatrix();
  const unresolvedCriterion = checklist.sections
    .flatMap((section) => section.criteria)
    .find((criterion) => criterion.legalRefs.includes("FL-1/2019"));

  if (!unresolvedCriterion) {
    throw new Error("Expected seeded checklist to contain an unresolved legal reference.");
  }

  const connection = createMigratedDatabase(databasePath);
  const assessment = createWorkplaceAssessment({
    db: connection.db,
    ownerId: "owner-1",
    workplace: {
      name: "Austurberg build site",
      address: "Austurberg 17",
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
    unresolvedCriterion,
  };
}

function prepareExportReadyState(
  fixture: ReturnType<typeof seedExportAssessmentFixture>,
) {
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
      "Needs immediate machine guard follow-up.",
      null,
      updatedAt.getTime(),
      fixture.assessmentId,
      fixture.unresolvedCriterion.id,
    );

  const findingRow = connection.sqlite
    .prepare(`
      select id
      from finding
      where assessment_id = ? and criterion_id = ?
    `)
    .get(fixture.assessmentId, fixture.unresolvedCriterion.id) as
    | { id: string }
    | undefined;

  if (!findingRow) {
    closeDatabase(connection);
    throw new Error("Expected persisted finding row to exist.");
  }

  connection.db.insert(riskEntry).values({
    id: "risk-entry-1",
    ownerId: "owner-1",
    findingId: findingRow.id,
    hazard: "Ungarded machine on site",
    healthEffects: "Crush or laceration injury",
    whoAtRisk: "Workers and visiting students",
    likelihood: 2,
    consequence: 3,
    riskLevel: "high",
    currentControls: "Daily pre-start checks",
    proposedAction: "Install compliant guard and lockout procedure",
    controlHierarchy: null,
    costEstimate: 42000,
    responsibleOwner: "Site foreman",
    dueDate: new Date("2026-04-25T00:00:00.000Z"),
    completedAt: null,
  }).run();

  connection.db.insert(assessmentSummary).values({
    assessmentId: fixture.assessmentId,
    ownerId: "owner-1",
    companyName: "Construction Co.",
    location: "Austurberg 17",
    assessmentDate: new Date("2026-04-20T00:00:00.000Z"),
    participants: "Student assessor, site foreman",
    method: "Walkthrough and risk review",
    notes: "Machine guarding and access control are the highest priorities.",
  }).run();

  closeDatabase(connection);
}

test("buildAssessmentExportDocuments preserves checklist order and maps summary/register data deterministically", () => {
  const fixture = seedExportAssessmentFixture();
  prepareExportReadyState(fixture);

  const connection = createMigratedDatabase(fixture.databasePath);
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
  const documents = buildAssessmentExportDocuments({
    readModel,
    riskRegisterProjection,
    summaryProjection,
  });

  assert.equal(documents.checklist.sections[0]?.id, fixture.checklist.sections[0]?.id);
  assert.equal(
    documents.checklist.sections[0]?.criteria[0]?.id,
    fixture.checklist.sections[0]?.criteria[0]?.id,
  );
  assert.equal(documents.summary.companyName, "Construction Co.");
  assert.equal(documents.summary.workplaceName, "Austurberg build site");
  assert.equal(documents.summary.assessmentDate, "2026-04-20");
  assert.deepEqual(
    documents.register.entries.map((entry) => entry.id),
    riskRegisterProjection.entries.map((entry) => entry.id),
  );
  assert.equal(documents.register.entries[0]?.riskLevel, "High");

  const unresolvedExportCriterion = documents.checklist.sections
    .flatMap((section) => section.criteria)
    .find((criterion) => criterion.id === fixture.unresolvedCriterion.id);

  assert.ok(unresolvedExportCriterion);
  assert.ok(unresolvedExportCriterion?.legalReferences.includes("FL-1/2019"));
  assert.ok(
    documents.checklist.sections
      .flatMap((section) => section.criteria)
      .flatMap((criterion) => criterion.legalReferences)
      .some((reference) => reference.includes(" - ")),
  );

  closeDatabase(connection);
});

test("generateAssessmentExportBundle returns a bundle manifest and typed not-ready failures", async () => {
  const readyFixture = seedExportAssessmentFixture();
  prepareExportReadyState(readyFixture);

  const readyConnection = createMigratedDatabase(readyFixture.databasePath);
  const successOutput = await generateAssessmentExportBundle({
    db: readyConnection.db,
    ownerId: "owner-1",
    input: {
      assessmentId: readyFixture.assessmentId,
    },
  });

  assert.equal(successOutput.assessmentId, readyFixture.assessmentId);
  assert.equal(successOutput.contentType, "application/zip");
  assert.equal(successOutput.files.length, 6);
  assert.match(
    Buffer.from(successOutput.payloadBase64, "base64").subarray(0, 2).toString("utf8"),
    /^PK/,
  );
  closeDatabase(readyConnection);

  const blockedFixture = seedExportAssessmentFixture();
  const blockedConnection = createMigratedDatabase(blockedFixture.databasePath);

  await assert.rejects(
    async () =>
      await generateAssessmentExportBundle({
        db: blockedConnection.db,
        ownerId: "owner-1",
        input: {
          assessmentId: blockedFixture.assessmentId,
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof GenerateAssessmentExportBundleError);
      assert.equal(error.status, 422);
      assert.equal(error.code, "assessment-export-not-ready");
      assert.equal(error.readiness?.exportReady, false);
      return true;
    },
  );

  closeDatabase(blockedConnection);
});

test("generateAssessmentExportBundleAction returns the zipped export bundle for a ready assessment", async () => {
  const fixture = seedExportAssessmentFixture();
  prepareExportReadyState(fixture);
  process.env.VARDI_DATABASE_PATH = fixture.databasePath;

  const { generateAssessmentExportBundleAction } = await import(
    "./generateAssessmentExportBundleAction"
  );
  const output = await generateAssessmentExportBundleAction({
    input: {
      assessmentId: fixture.assessmentId,
    },
  });

  assert.equal(output.assessmentId, fixture.assessmentId);
  assert.equal(output.files.length, 6);
  assert.equal(output.files[0]?.fileName, "checklist.docx");
});
