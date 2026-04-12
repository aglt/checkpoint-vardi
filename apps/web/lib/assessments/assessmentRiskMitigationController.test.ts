import assert from "node:assert/strict";
import test from "node:test";

import {
  addRiskMitigationActionDraft,
  beginRiskMitigationActionDelete,
  beginRiskMitigationActionSave,
  buildInitialRiskMitigationActionState,
  canPersistRiskMitigationActionDraft,
  isRiskMitigationActionDirty,
  reconcileRiskMitigationActionDeleteFailure,
  reconcileRiskMitigationActionDeleteSuccess,
  reconcileRiskMitigationActionSaveFailure,
  reconcileRiskMitigationActionSaveSuccess,
  removeUnsavedRiskMitigationActionDraft,
  updateRiskMitigationActionDraftField,
} from "./assessmentRiskMitigationController";
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
    mitigationActions: [
      {
        id: "action-1",
        description: "Install guard",
        assigneeName: "Workshop lead",
        dueDate: "2026-04-20",
        status: "open",
      },
    ],
  },
] as const;

test("mitigation-action controller builds saved state and supports local draft creation/removal", () => {
  const states = buildInitialRiskMitigationActionState(riskEntries);

  assert.equal(states["risk-entry-1"]?.length, 1);
  assert.equal(states["risk-entry-1"]?.[0]?.draft.description, "Install guard");

  const withDraft = addRiskMitigationActionDraft(states, "risk-entry-1");
  const localDraft = withDraft["risk-entry-1"]?.[1];

  assert.ok(localDraft);
  assert.equal(localDraft?.persistedId, null);
  assert.equal(canPersistRiskMitigationActionDraft(localDraft!.draft), false);

  const removedDraft = removeUnsavedRiskMitigationActionDraft(
    withDraft,
    "risk-entry-1",
    localDraft!.clientId,
  );

  assert.equal(removedDraft["risk-entry-1"]?.length, 1);
});

test("mitigation-action controller tracks create/update save success and dirty state", () => {
  const states = addRiskMitigationActionDraft(
    buildInitialRiskMitigationActionState(riskEntries),
    "risk-entry-1",
  );
  const localDraft = states["risk-entry-1"]?.[1];

  assert.ok(localDraft);

  const edited = updateRiskMitigationActionDraftField(
    states,
    "risk-entry-1",
    localDraft!.clientId,
    "description",
    "Add lockout checklist",
  );

  assert.equal(isRiskMitigationActionDirty(edited["risk-entry-1"]![1]!), true);

  const started = beginRiskMitigationActionSave(
    edited,
    "risk-entry-1",
    localDraft!.clientId,
  );
  const completed = reconcileRiskMitigationActionSaveSuccess(
    started.actionStates,
    "risk-entry-1",
    localDraft!.clientId,
    started.requestId,
    {
      assessmentId: "assessment-1",
      mitigationActionId: "action-2",
      riskEntryId: "risk-entry-1",
      description: "Add lockout checklist",
      assigneeName: null,
      dueDate: null,
      status: "open",
      createdAt: "2026-04-12T09:00:00.000Z",
      updatedAt: "2026-04-12T09:00:00.000Z",
    },
    edited["risk-entry-1"]![1]!.draft,
  );

  assert.equal(completed["risk-entry-1"]?.[1]?.persistedId, "action-2");
  assert.equal(completed["risk-entry-1"]?.[1]?.clientId, "action-2");
  assert.equal(completed["risk-entry-1"]?.[1]?.saveState, "idle");

  const failed = reconcileRiskMitigationActionSaveFailure(
    completed,
    "risk-entry-1",
    "action-2",
    started.requestId,
    "Save failed",
  );

  assert.equal(failed["risk-entry-1"]?.[1]?.saveState, "error");
  assert.equal(failed["risk-entry-1"]?.[1]?.errorMessage, "Save failed");
});

test("mitigation-action controller tracks delete success and failures for saved rows", () => {
  const states = buildInitialRiskMitigationActionState(riskEntries);

  const startedDelete = beginRiskMitigationActionDelete(
    states,
    "risk-entry-1",
    "action-1",
  );
  const failedDelete = reconcileRiskMitigationActionDeleteFailure(
    startedDelete.actionStates,
    "risk-entry-1",
    "action-1",
    startedDelete.requestId,
    "Delete failed",
  );

  assert.equal(failedDelete["risk-entry-1"]?.[0]?.saveState, "error");

  const restartedDelete = beginRiskMitigationActionDelete(
    failedDelete,
    "risk-entry-1",
    "action-1",
  );
  const deleted = reconcileRiskMitigationActionDeleteSuccess(
    restartedDelete.actionStates,
    "risk-entry-1",
    "action-1",
    restartedDelete.requestId,
  );

  assert.equal(deleted["risk-entry-1"]?.length, 0);
});
