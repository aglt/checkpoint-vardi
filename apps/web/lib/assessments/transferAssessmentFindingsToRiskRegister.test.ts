import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { getRiskMatrixBySlug, getSeedChecklistBySlug } from "@vardi/checklists";
import {
  closeDatabase,
  createBootstrappedDatabase,
  createWorkplaceAssessment,
  updateAssessmentFindingResponse,
} from "@vardi/db/testing";

import type { AssessmentReadModel } from "./loadAssessmentReadModel";
import {
  TransferAssessmentFindingsToRiskRegisterError,
  transferAssessmentFindingsToRiskRegister,
} from "./transferAssessmentFindingsToRiskRegister";

const startedAt = new Date("2026-04-12T11:00:00.000Z");

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
  const checklist = getRequiredChecklist();
  const riskMatrix = getRequiredRiskMatrix();
  const firstCriterion = checklist.sections[0]?.criteria[0];
  const secondCriterion = checklist.sections[0]?.criteria[1];

  if (!firstCriterion || !secondCriterion) {
    throw new Error("Expected checklist fixture to contain at least two criteria.");
  }

  const connection = createBootstrappedDatabase();
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

  return {
    checklist,
    connection,
    assessmentId: result.assessmentId,
    firstCriterion,
    secondCriterion,
  };
}

test("transferAssessmentFindingsToRiskRegister builds seeded hazard titles for persisted notOk criteria", () => {
  const connection = createBootstrappedDatabase();
  const capturedHazardByCriterionId: Array<Readonly<Record<string, string>>> = [];

  const output = transferAssessmentFindingsToRiskRegister({
    db: connection.db,
    ownerId: "owner-1",
    input: {
      assessmentId: "assessment-1",
    },
    dependencies: {
      loadAssessmentReadModel: () =>
        ({
          workplace: {
            id: "workplace-1",
            ownerId: "owner-1",
            name: "Workshop",
            address: null,
            archetype: "construction",
            primaryLanguage: "is",
          },
          assessment: {
            id: "assessment-1",
            ownerId: "owner-1",
            workplaceId: "workplace-1",
            checklistId: "checklist-1",
            checklistSlug: "woodworking-workshop",
            checklistVersion: "2026-04-12",
            riskMatrixId: "course-3x3",
            status: "draft",
            startedAt,
            completedAt: null,
          },
          checklist: {
            id: "checklist-1",
            slug: "woodworking-workshop",
            version: "2026-04-12",
            defaultLanguage: "is",
            workflowRules: {
              requiresJustification: false,
              requiresMitigationForRiskLevels: [],
              summaryRequiredFields: [
                "companyName",
                "location",
                "assessmentDate",
                "participants",
                "method",
                "notes",
              ],
            },
            translations: {
              is: {
                title: "Checklist",
              },
            },
          },
          riskMatrix: {
            id: "course-3x3",
            slug: "course-3x3",
            likelihoodLevels: 3,
            consequenceLevels: 3,
            translations: {
              is: {
                title: "Matrix",
              },
            },
          },
          summaryStatus: "absent",
          sections: [
            {
              id: "section-1",
              order: 1,
              translations: {
                is: {
                  title: "Section",
                },
              },
              criteria: [
                {
                  id: "criterion-not-ok",
                  number: "1.1",
                  order: 1,
                  legalRefs: [],
                  translations: {
                    is: {
                      title: "Guarding on table saw",
                      guidance: "Keep guards in place.",
                    },
                  },
                  response: {
                    id: "finding-1",
                    status: "notOk",
                    notes: "Guard missing",
                    voiceTranscript: null,
                    notesLanguage: "is",
                  },
                  riskEntryStatus: "absent",
                },
                {
                  id: "criterion-ok",
                  number: "1.2",
                  order: 2,
                  legalRefs: [],
                  translations: {
                    is: {
                      title: "Ventilation",
                      guidance: "Ventilation works.",
                    },
                  },
                  response: {
                    id: "finding-2",
                    status: "ok",
                    notes: null,
                    voiceTranscript: null,
                    notesLanguage: null,
                  },
                  riskEntryStatus: "absent",
                },
              ],
            },
          ],
        }) satisfies AssessmentReadModel,
      transferAssessmentFindingsToRiskRegister: (params) => {
        capturedHazardByCriterionId.push(params.hazardByCriterionId);

        return {
          assessmentId: params.assessmentId,
          eligibleFindingCount: 1,
          createdRiskEntryCount: 1,
          existingRiskEntryCount: 0,
        };
      },
    },
  });

  assert.deepEqual(capturedHazardByCriterionId, [
    {
      "criterion-not-ok": "Guarding on table saw",
    },
  ]);
  assert.deepEqual(output, {
    assessmentId: "assessment-1",
    eligibleFindingCount: 1,
    createdRiskEntryCount: 1,
    existingRiskEntryCount: 0,
  });

  closeDatabase(connection);
});

test("transferAssessmentFindingsToRiskRegister persists transferred risk entries with seeded hazards", () => {
  const fixture = seedAssessmentFixture();

  updateAssessmentFindingResponse({
    db: fixture.connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
    criterionId: fixture.secondCriterion.id,
    status: "notOk",
    notes: "Guard missing",
    updatedAt: new Date("2026-04-12T11:05:00.000Z"),
  });

  const output = transferAssessmentFindingsToRiskRegister({
    db: fixture.connection.db,
    ownerId: "owner-1",
    input: {
      assessmentId: fixture.assessmentId,
    },
  });

  assert.deepEqual(output, {
    assessmentId: fixture.assessmentId,
    eligibleFindingCount: 1,
    createdRiskEntryCount: 1,
    existingRiskEntryCount: 0,
  });

  const persistedRiskEntry = fixture.connection.sqlite
    .prepare(`
      select
        finding_id as findingId,
        hazard
      from risk_entry
      limit 1
    `)
    .get() as
      | {
          findingId: string;
          hazard: string | null;
        }
      | undefined;

  assert.ok(persistedRiskEntry);
  assert.equal(persistedRiskEntry.hazard, fixture.secondCriterion.translations.is.title);

  closeDatabase(fixture.connection);
});

test("transferAssessmentFindingsToRiskRegister validates input and missing assessments", () => {
  const connection = createBootstrappedDatabase();

  assert.throws(
    () =>
      transferAssessmentFindingsToRiskRegister({
        db: connection.db,
        ownerId: "owner-1",
        input: {
          assessmentId: "   ",
        },
      }),
    (error: unknown) =>
      error instanceof TransferAssessmentFindingsToRiskRegisterError &&
      error.status === 400 &&
      error.code === "invalid-risk-transfer-request",
  );

  assert.throws(
    () =>
      transferAssessmentFindingsToRiskRegister({
        db: connection.db,
        ownerId: "owner-1",
        input: {
          assessmentId: "missing-assessment",
        },
      }),
    (error: unknown) =>
      error instanceof TransferAssessmentFindingsToRiskRegisterError &&
      error.status === 404 &&
      error.code === "assessment-not-found",
  );

  closeDatabase(connection);
});

test("transferAssessmentFindingsToRiskRegister fails deterministically when an eligible finding loses its hazard mapping", () => {
  const fixture = seedAssessmentFixture();
  const consoleErrorMock = mock.method(console, "error", () => undefined);

  updateAssessmentFindingResponse({
    db: fixture.connection.db,
    ownerId: "owner-1",
    assessmentId: fixture.assessmentId,
    criterionId: fixture.firstCriterion.id,
    status: "notOk",
    notes: "Guard missing",
    updatedAt: new Date("2026-04-12T11:08:00.000Z"),
  });

  assert.throws(
    () =>
      transferAssessmentFindingsToRiskRegister({
        db: fixture.connection.db,
        ownerId: "owner-1",
        input: {
          assessmentId: fixture.assessmentId,
        },
        dependencies: {
          loadAssessmentReadModel: () =>
            ({
              workplace: {
                id: "workplace-1",
                ownerId: "owner-1",
                name: "Workshop",
                address: null,
                archetype: "construction",
                primaryLanguage: "is",
              },
              assessment: {
                id: fixture.assessmentId,
                ownerId: "owner-1",
                workplaceId: "workplace-1",
                checklistId: fixture.checklist.id,
                checklistSlug: fixture.checklist.slug,
                checklistVersion: fixture.checklist.version,
                riskMatrixId: "course-3x3",
                status: "draft",
                startedAt,
                completedAt: null,
              },
              checklist: {
                id: fixture.checklist.id,
                slug: fixture.checklist.slug,
                version: fixture.checklist.version,
                defaultLanguage: fixture.checklist.defaultLanguage,
                workflowRules: fixture.checklist.workflowRules,
                translations: fixture.checklist.translations,
              },
              riskMatrix: {
                id: "course-3x3",
                slug: "course-3x3",
                likelihoodLevels: 3,
                consequenceLevels: 3,
                translations: {
                  is: {
                    title: "Matrix",
                  },
                },
              },
              summaryStatus: "absent",
              sections: [],
            }) satisfies AssessmentReadModel,
        },
      }),
    (error: unknown) =>
      error instanceof TransferAssessmentFindingsToRiskRegisterError &&
      error.status === 500 &&
      error.code === "risk-transfer-unavailable",
  );

  consoleErrorMock.mock.restore();
  closeDatabase(fixture.connection);
});
