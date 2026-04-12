import assert from "node:assert/strict";
import test from "node:test";

import {
  beginRiskEntrySave,
  buildInitialRiskEntryState,
  canPersistRiskEntryDraft,
  isRiskEntryDirty,
  reconcileRiskEntrySaveFailure,
  reconcileRiskEntrySaveSuccess,
  updateRiskEntryDraftField,
} from "./assessmentRiskRegisterController";
import type { AssessmentRiskRegisterEntryProjection } from "./loadAssessmentRiskRegisterProjection";

const riskEntries: readonly AssessmentRiskRegisterEntryProjection[] = [
  {
    id: "risk-entry-1",
    sectionId: "section-1",
    sectionTitle: "Section one",
    criterionId: "criterion-1",
    criterionNumber: "1.1",
    criterionTitle: "Criterion one",
    findingId: "finding-1",
    hazard: "Initial hazard",
    healthEffects: null,
    whoAtRisk: null,
    likelihood: null,
    consequence: null,
    savedRiskLevel: null,
    classificationState: "staleRiskLevel",
    classificationReasoning: null,
    currentControls: null,
    costEstimate: null,
    mitigationActions: [],
  },
] as const;

test("buildInitialRiskEntryState preserves classification state without owned display copy", () => {
  const states = buildInitialRiskEntryState(riskEntries);

  assert.equal(states["risk-entry-1"]?.saved.hazard, "Initial hazard");
  assert.equal(states["risk-entry-1"]?.savedClassificationState, "staleRiskLevel");
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      states["risk-entry-1"] ?? {},
      "savedClassificationMessage",
    ),
    false,
  );
  assert.equal(canPersistRiskEntryDraft(states["risk-entry-1"]!.draft), true);
});

test("risk-entry controller updates drafts and clears stale warnings after a successful save", () => {
  const states = buildInitialRiskEntryState(riskEntries);
  const edited = updateRiskEntryDraftField(
    states,
    "risk-entry-1",
    "hazard",
    "Updated hazard",
  );

  assert.equal(isRiskEntryDirty(edited["risk-entry-1"]!), true);

  const started = beginRiskEntrySave(edited, "risk-entry-1");
  const completed = reconcileRiskEntrySaveSuccess(
    started.riskEntryStates,
    "risk-entry-1",
    started.requestId,
    {
      assessmentId: "assessment-1",
      riskEntryId: "risk-entry-1",
      hazard: "Updated hazard",
      healthEffects: null,
      whoAtRisk: null,
      likelihood: 2,
      consequence: 3,
      riskLevel: "high",
      classificationReasoning:
        "The saw is used often and a guard failure could cause severe injury.",
      currentControls: null,
      costEstimate: null,
    },
    edited["risk-entry-1"]!.draft,
  );

  assert.equal(completed["risk-entry-1"]?.saved.hazard, "Updated hazard");
  assert.equal(completed["risk-entry-1"]?.savedRiskLevel, "high");
  assert.equal(completed["risk-entry-1"]?.savedClassificationState, "ready");
  assert.equal(
    completed["risk-entry-1"]?.saved.classificationReasoning,
    "The saw is used often and a guard failure could cause severe injury.",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      completed["risk-entry-1"] ?? {},
      "savedClassificationMessage",
    ),
    false,
  );

  const failed = reconcileRiskEntrySaveFailure(
    completed,
    "risk-entry-1",
    started.requestId,
    "Save failed",
  );

  assert.equal(failed["risk-entry-1"]?.saveState, "error");
  assert.equal(failed["risk-entry-1"]?.errorMessage, "Save failed");
});

test("risk-entry controller treats classification reasoning as part of dirty state", () => {
  const states = buildInitialRiskEntryState(riskEntries);
  const edited = updateRiskEntryDraftField(
    states,
    "risk-entry-1",
    "classificationReasoning",
    "This row needs an explicit saved explanation.",
  );

  assert.equal(isRiskEntryDirty(edited["risk-entry-1"]!), true);
  assert.equal(
    edited["risk-entry-1"]?.draft.classificationReasoning,
    "This row needs an explicit saved explanation.",
  );
});
