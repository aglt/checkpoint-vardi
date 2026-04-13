import assert from "node:assert/strict";
import test from "node:test";

import { getSeedChecklistBySlug } from "@vardi/checklists";

import {
  evaluateAssessmentWorkflowRules,
  mapChecklistRulesToAppRules,
} from "./assessmentWorkflowRules";
import type { AssessmentReadModel } from "./loadAssessmentReadModel";
import type { AssessmentRiskRegisterProjection } from "./loadAssessmentRiskRegisterProjection";

function getRequiredChecklist(slug: "construction-site" | "woodworking-workshop") {
  const checklist = getSeedChecklistBySlug(slug);

  if (!checklist) {
    throw new Error(`Expected seeded checklist ${slug} to exist.`);
  }

  return checklist;
}

function createReadModelStub(
  slug: "construction-site" | "woodworking-workshop",
): AssessmentReadModel {
  const checklist = getRequiredChecklist(slug);

  return {
    workplace: {
      id: "workplace-1",
      ownerId: "owner-1",
      name: "Workplace",
      address: "Address",
      archetype: "construction",
      primaryLanguage: "is",
    },
    assessment: {
      id: "assessment-1",
      ownerId: "owner-1",
      workplaceId: "workplace-1",
      checklistId: checklist.id,
      checklistSlug: checklist.slug,
      checklistVersion: checklist.version,
      riskMatrixId: "risk-matrix-1",
      status: "draft",
      startedAt: new Date("2026-04-12T10:00:00.000Z"),
      completedAt: null,
    },
    checklist: {
      id: checklist.id,
      slug: checklist.slug,
      version: checklist.version,
      defaultLanguage: checklist.defaultLanguage,
      workflowRules: checklist.workflowRules,
      translations: checklist.translations,
    },
    riskMatrix: {
      id: "risk-matrix-1",
      slug: "course-3x3",
      likelihoodLevels: 3,
      consequenceLevels: 3,
      translations: {
        is: {
          title: "Námsefni 3x3",
        },
      },
    },
    summaryStatus: "absent",
    sections: [],
  };
}

function createRiskRegisterProjectionStub(
  entries: AssessmentRiskRegisterProjection["entries"],
): AssessmentRiskRegisterProjection {
  return {
    assessmentId: "assessment-1",
    riskMatrix: {
      id: "risk-matrix-1",
      title: "Námsefni 3x3",
      likelihoodLevels: 3,
      consequenceLevels: 3,
      severityChoices: [],
    },
    entries,
  };
}

test("mapChecklistRulesToAppRules preserves normalized runtime rules without leaking raw literals", () => {
  const constructionChecklist = getRequiredChecklist("construction-site");
  const woodworkingChecklist = getRequiredChecklist("woodworking-workshop");

  assert.deepEqual(
    mapChecklistRulesToAppRules(constructionChecklist.workflowRules),
    {
      requiresJustification: true,
      requiresMitigationForRiskLevels: ["medium", "high"],
      summaryRequiredFields: [
        "companyName",
        "location",
        "assessmentDate",
        "participants",
        "method",
        "notes",
      ],
    },
  );
  assert.deepEqual(
    mapChecklistRulesToAppRules(woodworkingChecklist.workflowRules),
    {
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
  );
});

test("evaluateAssessmentWorkflowRules reports missing justification and mitigation for construction rows", () => {
  const readModel = createReadModelStub("construction-site");
  const rules = mapChecklistRulesToAppRules(readModel.checklist.workflowRules);
  const riskRegisterProjection = createRiskRegisterProjectionStub([
    {
      id: "risk-entry-1",
      sectionId: "section-1",
      sectionTitle: "Section 1",
      criterionId: "criterion-1",
      criterionNumber: "1",
      criterionTitle: "Criterion 1",
      findingId: "finding-1",
      hazard: "Missing guard",
      healthEffects: null,
      whoAtRisk: null,
      likelihood: 2,
      consequence: 3,
      savedRiskLevel: "high",
      classificationState: "ready",
      classificationReasoning: null,
      currentControls: null,
      costEstimate: null,
      mitigationActions: [],
    },
    {
      id: "risk-entry-2",
      sectionId: "section-1",
      sectionTitle: "Section 1",
      criterionId: "criterion-2",
      criterionNumber: "2",
      criterionTitle: "Criterion 2",
      findingId: "finding-2",
      hazard: "Dust exposure",
      healthEffects: null,
      whoAtRisk: null,
      likelihood: 2,
      consequence: 2,
      savedRiskLevel: "medium",
      classificationState: "ready",
      classificationReasoning: "Saved explanation",
      currentControls: null,
      costEstimate: null,
      mitigationActions: [],
    },
  ]);

  const evaluation = evaluateAssessmentWorkflowRules({
    readModel,
    riskRegisterProjection,
    summary: {
      companyName: "Construction Co.",
      location: "Austurberg 17",
      assessmentDate: "2026-04-20",
      participants: "",
      method: "Walkthrough",
      notes: "",
    },
    rules,
  });

  assert.deepEqual(evaluation.missingSummaryFieldIds, ["participants", "notes"]);
  assert.equal(evaluation.missingJustificationCount, 1);
  assert.equal(evaluation.missingMitigationCount, 2);
  assert.equal(evaluation.blocksRiskRegister, true);
  assert.equal(evaluation.blocksExport, true);
  assert.deepEqual(evaluation.entryResultsByRiskEntryId["risk-entry-1"], {
    riskEntryId: "risk-entry-1",
    requiresJustification: true,
    missingJustification: true,
    requiresMitigation: true,
    missingMitigation: true,
  });
  assert.deepEqual(evaluation.entryResultsByRiskEntryId["risk-entry-2"], {
    riskEntryId: "risk-entry-2",
    requiresJustification: true,
    missingJustification: false,
    requiresMitigation: true,
    missingMitigation: true,
  });
});

test("evaluateAssessmentWorkflowRules keeps woodworking rows backward-compatible by default", () => {
  const readModel = createReadModelStub("woodworking-workshop");
  const evaluation = evaluateAssessmentWorkflowRules({
    readModel,
    riskRegisterProjection: createRiskRegisterProjectionStub([
      {
        id: "risk-entry-1",
        sectionId: "section-1",
        sectionTitle: "Section 1",
        criterionId: "criterion-1",
        criterionNumber: "1",
        criterionTitle: "Criterion 1",
        findingId: "finding-1",
        hazard: "Missing guard",
        healthEffects: null,
        whoAtRisk: null,
        likelihood: 3,
        consequence: 3,
        savedRiskLevel: "high",
        classificationState: "ready",
        classificationReasoning: null,
        currentControls: null,
        costEstimate: null,
        mitigationActions: [],
      },
    ]),
    summary: {
      companyName: null,
      location: null,
      assessmentDate: null,
      participants: null,
      method: null,
      notes: null,
    },
    rules: mapChecklistRulesToAppRules(readModel.checklist.workflowRules),
  });

  assert.equal(evaluation.missingJustificationCount, 0);
  assert.equal(evaluation.missingMitigationCount, 0);
  assert.deepEqual(evaluation.entryResultsByRiskEntryId["risk-entry-1"], {
    riskEntryId: "risk-entry-1",
    requiresJustification: false,
    missingJustification: false,
    requiresMitigation: false,
    missingMitigation: false,
  });
});
