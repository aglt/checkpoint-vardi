import assert from "node:assert/strict";
import test from "node:test";

import { closeDatabase, createMigratedDatabase } from "./database.js";
import { createWorkplaceAssessment } from "./create-workplace-assessment.js";

const startedAt = new Date("2026-04-11T12:00:00.000Z");

function buildCreateParams(criterionIds: readonly string[] = [
  "checklist.section-01.criterion-01",
  "checklist.section-01.criterion-02",
  "checklist.section-02.criterion-01",
]) {
  const connection = createMigratedDatabase();

  return {
    connection,
    params: {
      db: connection.db,
      ownerId: "owner-1",
      workplace: {
        name: "Workshop",
        address: "Austurberg 1",
        archetype: "construction" as const,
        primaryLanguage: "is",
      },
      assessment: {
        checklistId: "checklist.woodworking-workshop",
        checklistSlug: "woodworking-workshop",
        checklistVersion: "2026-04-11",
        riskMatrixId: "risk-matrix.course-3x3",
        startedAt,
      },
      criterionIds,
    },
  };
}

test("createWorkplaceAssessment pins the full checklist tuple and materializes unanswered findings", () => {
  const { connection, params } = buildCreateParams();

  const result = createWorkplaceAssessment(params);

  const persistedAssessment = connection.sqlite
    .prepare(`
      select
        owner_id as ownerId,
        workplace_id as workplaceId,
        checklist_id as checklistId,
        checklist_slug as checklistSlug,
        checklist_version as checklistVersion,
        risk_matrix_id as riskMatrixId,
        status,
        started_at as startedAt
      from risk_assessment
      where id = ?
    `)
    .get(result.assessmentId) as
      | {
          ownerId: string;
          workplaceId: string;
          checklistId: string;
          checklistSlug: string;
          checklistVersion: string;
          riskMatrixId: string;
          status: string;
          startedAt: number;
        }
      | undefined;

  assert.ok(persistedAssessment);
  assert.equal(persistedAssessment.ownerId, "owner-1");
  assert.equal(persistedAssessment.checklistId, params.assessment.checklistId);
  assert.equal(persistedAssessment.checklistSlug, params.assessment.checklistSlug);
  assert.equal(persistedAssessment.checklistVersion, params.assessment.checklistVersion);
  assert.equal(persistedAssessment.riskMatrixId, params.assessment.riskMatrixId);
  assert.equal(persistedAssessment.status, "draft");
  assert.equal(persistedAssessment.workplaceId, result.workplaceId);
  assert.equal(persistedAssessment.startedAt, startedAt.getTime());

  const persistedFindings = connection.sqlite
    .prepare(`
      select
        criterion_id as criterionId,
        status,
        notes,
        voice_transcript as voiceTranscript,
        notes_language as notesLanguage
      from finding
      where assessment_id = ?
      order by rowid
    `)
    .all(result.assessmentId) as Array<{
      criterionId: string;
      status: string;
      notes: string | null;
      voiceTranscript: string | null;
      notesLanguage: string | null;
    }>;

  assert.equal(persistedFindings.length, params.criterionIds.length);
  assert.deepEqual(
    persistedFindings.map((findingRow) => findingRow.criterionId),
    params.criterionIds,
  );
  assert.ok(
    persistedFindings.every((findingRow) =>
      findingRow.status === "unanswered" &&
      findingRow.notes === null &&
      findingRow.voiceTranscript === null &&
      findingRow.notesLanguage === null
    ),
  );

  closeDatabase(connection);
});

test("createWorkplaceAssessment rolls back partial writes when finding materialization fails", () => {
  const { connection, params } = buildCreateParams([
    "checklist.section-01.criterion-01",
    "checklist.section-01.criterion-01",
  ]);

  assert.throws(() => createWorkplaceAssessment(params));

  const counts = connection.sqlite
    .prepare(`
      select
        (select count(*) from workplace) as workplaceCount,
        (select count(*) from risk_assessment) as assessmentCount,
        (select count(*) from finding) as findingCount
    `)
    .get() as {
      workplaceCount: number;
      assessmentCount: number;
      findingCount: number;
    };

  assert.deepEqual(counts, {
    workplaceCount: 0,
    assessmentCount: 0,
    findingCount: 0,
  });

  closeDatabase(connection);
});
