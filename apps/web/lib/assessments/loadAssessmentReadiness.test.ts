import assert from "node:assert/strict";
import test from "node:test";

import { getRiskMatrixBySlug, getSeedChecklistBySlug } from "@vardi/checklists";
import {
  closeDatabase,
  createMigratedDatabase,
  riskAssessment,
  workplace,
} from "@vardi/db/testing";

import { loadAssessmentReadiness } from "./loadAssessmentReadiness";

const checklist = getRequiredChecklist();
const riskMatrix = getRequiredRiskMatrix();
const startedAt = new Date("2026-04-11T10:00:00.000Z");

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

test("loadAssessmentReadiness narrows the assessment page to readiness metadata only", () => {
  const connection = createMigratedDatabase();

  connection.db.insert(workplace).values({
    id: "workplace-1",
    ownerId: "owner-1",
    name: "Workshop",
    address: "Austurberg 1",
    archetype: "construction",
    primaryLanguage: "is",
  }).run();

  connection.db.insert(riskAssessment).values({
    id: "assessment-1",
    ownerId: "owner-1",
    workplaceId: "workplace-1",
    checklistId: checklist.id,
    checklistSlug: checklist.slug,
    checklistVersion: checklist.version,
    riskMatrixId: riskMatrix.id,
    status: "draft",
    startedAt,
    completedAt: null,
  }).run();

  const readiness = loadAssessmentReadiness({
    db: connection.db,
    ownerId: "owner-1",
    assessmentId: "assessment-1",
  });

  assert.deepEqual(readiness, {
    assessmentId: "assessment-1",
    workplaceName: "Workshop",
    checklistTitle: checklist.translations.is.title,
    riskMatrixTitle: riskMatrix.translations.is.title,
    sectionCount: checklist.sections.length,
    criterionCount: checklist.sections.reduce(
      (count, section) => count + section.criteria.length,
      0,
    ),
  });

  assert.ok(!("sections" in readiness));

  closeDatabase(connection);
});
