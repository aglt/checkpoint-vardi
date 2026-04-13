import { getSeedChecklistBySlug } from "@vardi/checklists";
import {
  closeDatabase,
  createBootstrappedDatabase,
  updateAssessmentFindingResponse,
} from "@vardi/db/testing";

import { resolveE2eDatabasePath } from "../support/e2eDatabase.mjs";

const OWNER_ID = "owner-1";
const updatedAt = new Date("2026-04-12T10:15:00.000Z");

const assessmentId = process.argv[2];

if (!assessmentId) {
  throw new Error("Expected assessment id argument for construction walkthrough seeding.");
}

const checklist = getSeedChecklistBySlug("construction-site");

if (!checklist) {
  throw new Error("Expected seeded construction checklist to exist.");
}

const criteria = checklist.sections.flatMap((section) => section.criteria);
const firstCriterionId = criteria[0]?.id;

if (!firstCriterionId) {
  throw new Error("Expected construction checklist to contain at least one criterion.");
}

const connection = createBootstrappedDatabase(resolveE2eDatabasePath());

try {
  for (const criterion of criteria) {
    updateAssessmentFindingResponse({
      db: connection.db,
      ownerId: OWNER_ID,
      assessmentId,
      criterionId: criterion.id,
      status: criterion.id === firstCriterionId ? "notOk" : "ok",
      attentionSeverity: criterion.id === firstCriterionId ? "large" : null,
      notes:
        criterion.id === firstCriterionId
          ? "Open trench edge still needs follow-up."
          : null,
      updatedAt,
    });
  }
} finally {
  closeDatabase(connection);
}
