import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { getRiskMatrixBySlug, getSeedChecklistBySlug } from "@vardi/checklists";
import {
  assessmentSummary,
  closeDatabase,
  createBootstrappedDatabase,
  createWorkplaceAssessment,
  riskMitigationAction,
  riskEntry,
} from "@vardi/db/testing";
import type { AssessmentStructuredReportDocument } from "@vardi/export";

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

  const connection = createBootstrappedDatabase(databasePath);
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
  overrides?: {
    readonly classificationReasoning?: string | null;
  },
) {
  const connection = createBootstrappedDatabase(fixture.databasePath);
  connection.sqlite
    .prepare(`
      update finding
      set status = ?, attention_severity = ?, notes = ?, notes_language = ?, updated_at = ?
      where assessment_id = ?
    `)
    .run("ok", null, null, null, updatedAt.getTime(), fixture.assessmentId);

  connection.sqlite
    .prepare(`
      update finding
      set status = ?, attention_severity = ?, notes = ?, notes_language = ?, updated_at = ?
      where assessment_id = ? and criterion_id = ?
    `)
    .run(
      "notOk",
      "large",
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
    classificationReasoning:
      overrides && "classificationReasoning" in overrides
        ? overrides.classificationReasoning ?? null
        : "Workers pass the machine often and an unguarded contact could cause severe injury.",
    currentControls: "Daily pre-start checks",
    controlHierarchy: null,
    costEstimate: 42000,
  }).run();

  connection.db.insert(riskMitigationAction).values([
    {
      id: "action-2",
      riskEntryId: "risk-entry-1",
      ownerId: "owner-1",
      description: "Brief the site crew on the new lockout flow",
      assigneeName: "Safety coordinator",
      dueDate: null,
      status: "done",
      createdAt: new Date("2026-04-20T08:05:00.000Z"),
      updatedAt: new Date("2026-04-20T08:05:00.000Z"),
    },
    {
      id: "action-1",
      riskEntryId: "risk-entry-1",
      ownerId: "owner-1",
      description: "Install compliant guard and lockout procedure",
      assigneeName: "Site foreman",
      dueDate: new Date("2026-04-25T00:00:00.000Z"),
      status: "open",
      createdAt: new Date("2026-04-20T08:00:00.000Z"),
      updatedAt: new Date("2026-04-20T08:00:00.000Z"),
    },
  ]).run();

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

function getSection(
  document: AssessmentStructuredReportDocument,
  title: string,
) {
  return document.sections.find((section) => section.title === title);
}

function getSectionRow(
  document: AssessmentStructuredReportDocument,
  sectionTitle: string,
  label: string,
) {
  return getSection(document, sectionTitle)?.rows?.find((row) => row.label === label);
}

function getSectionBlock(
  document: AssessmentStructuredReportDocument,
  sectionTitle: string,
  index: number,
) {
  return getSection(document, sectionTitle)?.blocks?.[index];
}

function getBlockRow(
  document: AssessmentStructuredReportDocument,
  sectionTitle: string,
  blockIndex: number,
  label: string,
) {
  return getSectionBlock(document, sectionTitle, blockIndex)?.rows.find(
    (row) => row.label === label,
  );
}

test("buildAssessmentExportDocuments adds deterministic framing, provenance, and mitigation ordering from persisted truth", () => {
  const fixture = seedExportAssessmentFixture();
  prepareExportReadyState(fixture, {
    classificationReasoning:
      "Workers pass the machine often and an unguarded contact could cause severe injury.",
  });

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
  const documents = buildAssessmentExportDocuments({
    readModel,
    riskRegisterProjection,
    summaryProjection,
  });

  assert.equal(documents.checklist.title, "Assessment checklist observations");
  assert.deepEqual(
    documents.checklist.sections.map((section) => section.title),
    [
      "Assessment record",
      "Workplace context",
      "Template provenance",
      "Framing and provenance",
      "Checklist observations",
    ],
  );
  assert.equal(
    getSectionRow(documents.summary, "Assessment record", "Company")?.value,
    "Construction Co.",
  );
  assert.equal(
    getSectionRow(documents.summary, "Workplace context", "Workplace")?.value,
    "Austurberg build site",
  );
  assert.equal(
    getSectionRow(documents.summary, "Assessment record", "Assessment date")?.value,
    "2026-04-20",
  );
  assert.equal(
    getSectionRow(documents.summary, "Assessment record", "Assessment started")?.value,
    "2026-04-12 10:00 UTC",
  );
  assert.equal(
    getSectionRow(documents.register, "Template provenance", "Risk matrix")?.value,
    "Námsefni 3x3 (course-3x3)",
  );
  assert.equal(
    getSectionRow(
      documents.register,
      "Framing and provenance",
      "Saved-state provenance",
    )?.value,
    "All included values come from saved assessment records and seeded runtime references pinned to this assessment.",
  );
  assert.equal(
    getSectionBlock(documents.register, "Risk register and classification", 0)?.title,
    "Entry 1 - Ungarded machine on site",
  );
  assert.equal(
    getBlockRow(
      documents.register,
      "Risk register and classification",
      0,
      "Classification reasoning",
    )?.value,
    "Workers pass the machine often and an unguarded contact could cause severe injury.",
  );
  assert.equal(
    getSectionBlock(documents.checklist, "Checklist observations", 0)?.title,
    `Criterion ${fixture.checklist.sections[0]?.criteria[0]?.number} - ${fixture.checklist.sections[0]?.criteria[0]?.translations.is.title}`,
  );
  const unresolvedBlockTitle = `Criterion ${fixture.unresolvedCriterion.number} - ${fixture.unresolvedCriterion.translations.is.title}`;
  const unresolvedExportBlock = getSection(
    documents.checklist,
    "Checklist observations",
  )?.blocks?.find((block) =>
    block.title === unresolvedBlockTitle,
  );

  assert.ok(unresolvedExportBlock);
  assert.equal(
    unresolvedExportBlock?.rows
      .find((row) => row.label === "Legal reference linkage")
      ?.value?.includes("FL-1/2019"),
    true,
  );
  assert.ok(
    getSection(documents.checklist, "Checklist observations")?.blocks?.some((block) =>
      block.rows.some(
        (row) =>
          row.label === "Legal reference linkage" &&
          row.value.includes(" - "),
      ),
    ),
  );
  const unresolvedReferenceHandling = getSectionRow(
    documents.checklist,
    "Framing and provenance",
    "Unresolved legal-reference handling",
  )?.value;

  assert.ok(unresolvedReferenceHandling?.includes("FL-1/2019"));
  assert.equal(unresolvedReferenceHandling?.includes(" - "), false);
  assert.deepEqual(
    getSection(documents.register, "Mitigation action plan")?.blocks?.[0]?.rows?.map(
      (row) => row.value,
    ),
    [
      "Install compliant guard and lockout procedure. Status: Open. Assignee: Site foreman. Due: 2026-04-25",
      "Brief the site crew on the new lockout flow. Status: Done. Assignee: Safety coordinator",
    ],
  );
  assert.equal(
    getSectionRow(documents.summary, "Assessment summary", "Participants")?.value,
    "Student assessor, site foreman",
  );
  assert.equal(
    getSectionRow(documents.summary, "Priority risk overview", "Priority 1")?.value,
    [
      "Risk level: High",
      `Hazard: ${summaryProjection.prioritizedEntries[0]?.hazard}`,
      `Checklist section: ${summaryProjection.prioritizedEntries[0]?.sectionTitle}`,
      `Criterion ${summaryProjection.prioritizedEntries[0]?.criterionNumber} - ${summaryProjection.prioritizedEntries[0]?.criterionTitle}`,
    ].join(" | "),
  );

  closeDatabase(connection);
});

test("generateAssessmentExportBundle returns a bundle manifest and typed not-ready failures", async () => {
  const readyFixture = seedExportAssessmentFixture();
  prepareExportReadyState(readyFixture);

  const readyConnection = createBootstrappedDatabase(readyFixture.databasePath);
  const readyRiskRegisterProjection = loadAssessmentRiskRegisterProjection({
    db: readyConnection.db,
    ownerId: "owner-1",
    assessmentId: readyFixture.assessmentId,
  });

  assert.equal(
    readyRiskRegisterProjection.entries[0]?.classificationReasoning,
    "Workers pass the machine often and an unguarded contact could cause severe injury.",
  );

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

  const workflowBlockedFixture = seedExportAssessmentFixture();
  prepareExportReadyState(workflowBlockedFixture, {
    classificationReasoning: null,
  });
  const workflowBlockedConnection = createBootstrappedDatabase(
    workflowBlockedFixture.databasePath,
  );

  await assert.rejects(
    async () =>
      await generateAssessmentExportBundle({
        db: workflowBlockedConnection.db,
        ownerId: "owner-1",
        input: {
          assessmentId: workflowBlockedFixture.assessmentId,
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof GenerateAssessmentExportBundleError);
      assert.equal(error.status, 422);
      assert.equal(error.code, "assessment-export-not-ready");
      assert.equal(error.readiness?.exportReady, true);
      return true;
    },
  );

  closeDatabase(workflowBlockedConnection);

  const blockedFixture = seedExportAssessmentFixture();
  const blockedConnection = createBootstrappedDatabase(blockedFixture.databasePath);

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
