import assert from "node:assert/strict";
import test from "node:test";

import { getRiskMatrixBySlug, getSeedChecklistBySlug } from "@vardi/checklists";
import {
  assessmentSummary,
  closeDatabase,
  createBootstrappedDatabase,
  finding,
  riskAssessment,
  riskEntry,
  workplace,
} from "@vardi/db/testing";

import { AssessmentReadModelIntegrityError, loadAssessmentReadModel } from "./loadAssessmentReadModel";

const checklist = getRequiredChecklist();
const riskMatrix = getRequiredRiskMatrix();

const startedAt = new Date("2026-04-11T10:00:00.000Z");
const createdAt = new Date("2026-04-11T10:05:00.000Z");
const updatedAt = new Date("2026-04-11T10:06:00.000Z");

function seedBaseAssessment(options?: {
  readonly assessmentId?: string;
  readonly checklistId?: string;
  readonly checklistSlug?: string;
  readonly checklistVersion?: string;
  readonly riskMatrixId?: string;
}) {
  const connection = createBootstrappedDatabase();

  connection.db.insert(workplace).values({
    id: "workplace-1",
    ownerId: "owner-1",
    name: "Workshop",
    address: "Austurberg 1",
    archetype: "construction",
    primaryLanguage: "is",
  }).run();

  connection.db.insert(riskAssessment).values({
    id: options?.assessmentId ?? "assessment-1",
    ownerId: "owner-1",
    workplaceId: "workplace-1",
    checklistId: options?.checklistId ?? checklist.id,
    checklistSlug: options?.checklistSlug ?? checklist.slug,
    checklistVersion: options?.checklistVersion ?? checklist.version,
    riskMatrixId: options?.riskMatrixId ?? riskMatrix.id,
    status: "draft",
    startedAt,
    completedAt: null,
  }).run();

  return connection;
}

function getRequiredChecklist() {
  const seededChecklist = getSeedChecklistBySlug("woodworking-workshop");
  if (!seededChecklist) {
    throw new Error("Expected seeded woodworking checklist fixture to exist.");
  }

  return seededChecklist;
}

function getRequiredRiskMatrix() {
  const seededRiskMatrix = getRiskMatrixBySlug("course-3x3");
  if (!seededRiskMatrix) {
    throw new Error("Expected seeded 3x3 risk matrix fixture to exist.");
  }

  return seededRiskMatrix;
}

test("loadAssessmentReadModel preserves seeded ordering and unanswered defaults", () => {
  const connection = seedBaseAssessment();

  const readModel = loadAssessmentReadModel({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
  });

  assert.equal(readModel.checklist.id, checklist.id);
  assert.equal(readModel.riskMatrix.id, riskMatrix.id);
  assert.equal(readModel.sections.length, checklist.sections.length);
  assert.equal(readModel.summaryStatus, "absent");
  assert.equal(readModel.sections[0]?.id, checklist.sections[0]?.id);
  assert.equal(
    readModel.sections[0]?.criteria[0]?.id,
    checklist.sections[0]?.criteria[0]?.id,
  );
  assert.equal(
    readModel.sections[0]?.criteria[0]?.response.status,
    "unanswered",
  );
  assert.equal(
    readModel.sections[0]?.criteria[0]?.riskEntryStatus,
    "absent",
  );

  closeDatabase(connection);
});

test("response overlay is keyed by criterion id rather than insertion order", () => {
  const connection = seedBaseAssessment();
  const firstCriterion = checklist.sections[0]?.criteria[0];
  const secondCriterion = checklist.sections[0]?.criteria[1];

  if (!firstCriterion || !secondCriterion) {
    throw new Error("Expected first checklist section to contain at least two criteria.");
  }

  connection.db.insert(finding).values([
    {
      id: "finding-2",
      ownerId: "owner-1",
      assessmentId: "assessment-1",
      criterionId: secondCriterion.id,
      status: "notOk",
      notes: "second inserted first",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt: createdAt,
      updatedAt: updatedAt,
    },
    {
      id: "finding-1",
      ownerId: "owner-1",
      assessmentId: "assessment-1",
      criterionId: firstCriterion.id,
      status: "ok",
      notes: "first inserted second",
      voiceTranscript: null,
      notesLanguage: "is",
      createdAt: new Date("2026-04-11T10:07:00.000Z"),
      updatedAt: new Date("2026-04-11T10:08:00.000Z"),
    },
  ]).run();

  connection.db.insert(riskEntry).values({
    id: "risk-entry-1",
    ownerId: "owner-1",
    findingId: "finding-2",
    hazard: "Saw hazard",
    healthEffects: null,
    whoAtRisk: null,
    likelihood: null,
    consequence: null,
    riskLevel: null,
    currentControls: null,
    controlHierarchy: null,
    costEstimate: null,
  }).run();

  connection.db.insert(assessmentSummary).values({
    assessmentId: "assessment-1",
    ownerId: "owner-1",
    companyName: "Checkpoint Vardi",
    location: "Reykjavik",
    assessmentDate: startedAt,
    participants: "Assessor",
    method: "Walkthrough",
    notes: "Summary present",
  }).run();

  const readModel = loadAssessmentReadModel({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
  });

  assert.equal(
    readModel.sections[0]?.criteria[0]?.response.notes,
    "first inserted second",
  );
  assert.equal(
    readModel.sections[0]?.criteria[1]?.response.notes,
    "second inserted first",
  );
  assert.equal(readModel.sections[0]?.criteria[1]?.riskEntryStatus, "present");
  assert.equal(readModel.summaryStatus, "present");

  closeDatabase(connection);
});

test("unknown checklist ids fail deterministically", () => {
  const connection = seedBaseAssessment({
    checklistId: "missing-checklist",
  });

  assert.throws(
    () =>
      loadAssessmentReadModel({
        db: connection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-1",
      }),
    (error: unknown) =>
      error instanceof AssessmentReadModelIntegrityError &&
      error.message.includes("unknown checklist"),
  );

  closeDatabase(connection);
});

test("mismatched checklist slug and version fail deterministically", () => {
  const slugMismatchConnection = seedBaseAssessment({
    checklistSlug: "wrong-slug",
  });

  assert.throws(
    () =>
      loadAssessmentReadModel({
        db: slugMismatchConnection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-1",
      }),
    (error: unknown) =>
      error instanceof AssessmentReadModelIntegrityError &&
      error.message.includes("checklist slug mismatch"),
  );

  closeDatabase(slugMismatchConnection);

  const versionMismatchConnection = seedBaseAssessment({
    assessmentId: "assessment-2",
    checklistVersion: "1900-01-01",
  });

  assert.throws(
    () =>
      loadAssessmentReadModel({
        db: versionMismatchConnection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-2",
      }),
    (error: unknown) =>
      error instanceof AssessmentReadModelIntegrityError &&
      error.message.includes("checklist version mismatch"),
  );

  closeDatabase(versionMismatchConnection);
});

test("orphaned criterion ids and unknown risk matrices fail deterministically", () => {
  const orphanConnection = seedBaseAssessment();

  orphanConnection.db.insert(finding).values({
    id: "finding-orphan",
    ownerId: "owner-1",
    assessmentId: "assessment-1",
    criterionId: "woodworking-workshop.section-99.criterion-99",
    status: "notOk",
    notes: "orphaned",
    voiceTranscript: null,
    notesLanguage: "is",
    createdAt,
    updatedAt,
  }).run();

  assert.throws(
    () =>
      loadAssessmentReadModel({
        db: orphanConnection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-1",
      }),
    (error: unknown) =>
      error instanceof AssessmentReadModelIntegrityError &&
      error.message.includes("orphaned criterion"),
  );

  closeDatabase(orphanConnection);

  const matrixConnection = seedBaseAssessment({
    assessmentId: "assessment-2",
    riskMatrixId: "missing-matrix",
  });

  assert.throws(
    () =>
      loadAssessmentReadModel({
        db: matrixConnection.db,
        ownerId: "owner-1",
        assessmentId: "assessment-2",
      }),
    (error: unknown) =>
      error instanceof AssessmentReadModelIntegrityError &&
      error.message.includes("unknown risk matrix"),
  );

  closeDatabase(matrixConnection);
});
