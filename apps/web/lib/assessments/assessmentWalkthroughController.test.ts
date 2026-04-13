import assert from "node:assert/strict";
import test from "node:test";

import type { SaveAssessmentCriterionResponseOutput } from "@vardi/schemas";

import {
  beginCriterionSave,
  buildInitialCriterionRiskEntryStatus,
  buildInitialCriterionState,
  getAssessmentRiskTransferProgress,
  getAssessmentWalkthroughProgress,
  getDraftWalkthroughItemState,
  getNextBlocker,
  getRecoveryCriterionId,
  getSavedWalkthroughItemState,
  getSectionWalkthroughSummary,
  markTransferredRiskEntriesPresent,
  reconcileCriterionSaveFailure,
  reconcileCriterionSaveSuccess,
  updateCriterionDraftNotes,
} from "./assessmentWalkthroughController";
import type { AssessmentSectionReadModel } from "./loadAssessmentReadModel";

const sections: readonly AssessmentSectionReadModel[] = [
  {
    id: "section-1",
    order: 1,
    translations: {
      is: {
        title: "Section one",
      },
    },
    criteria: [
      {
        id: "criterion-1",
        number: "1.1",
        order: 1,
        legalRefs: [],
        translations: {
          is: {
            title: "Criterion one",
            guidance: "Guidance one",
          },
        },
        response: {
          id: "finding-1",
          status: "unanswered",
          attentionSeverity: null,
          notes: null,
          voiceTranscript: null,
          notesLanguage: null,
        },
        riskEntryStatus: "absent",
      },
      {
        id: "criterion-2",
        number: "1.2",
        order: 2,
        legalRefs: [],
        translations: {
          is: {
            title: "Criterion two",
            guidance: "Guidance two",
          },
        },
        response: {
          id: "finding-2",
          status: "notApplicable",
          attentionSeverity: null,
          notes: "Already covered",
          voiceTranscript: null,
          notesLanguage: null,
        },
        riskEntryStatus: "absent",
      },
    ],
  },
] as const;

function createSaveResponse(
  overrides?: Partial<SaveAssessmentCriterionResponseOutput>,
): SaveAssessmentCriterionResponseOutput {
  return {
    assessmentId: "assessment-1",
    criterionId: "criterion-1",
    status: "ok",
    attentionSeverity: null,
    notes: "Saved note",
    updatedAt: "2026-04-11T10:15:00.000Z",
    ...overrides,
  };
}

test("buildInitialCriterionState and progress preserve resumed answers", () => {
  const criterionStates = buildInitialCriterionState(sections);
  const progress = getAssessmentWalkthroughProgress(sections, criterionStates);

  assert.equal(criterionStates["criterion-1"]?.draft.status, "unanswered");
  assert.equal(criterionStates["criterion-2"]?.draft.status, "notApplicable");
  assert.equal(criterionStates["criterion-2"]?.draft.notes, "Already covered");
  assert.deepEqual(progress, {
    totalCriteria: 2,
    validCompletedCriteria: 1,
    needsAttentionCriteria: 0,
    completedSections: 0,
    progressPercentage: 50,
  });
});

test("risk transfer progress only counts persisted notOk findings and can mark them transferred", () => {
  const criterionStates = buildInitialCriterionState(sections);
  const initialRiskEntryStatus = buildInitialCriterionRiskEntryStatus(sections);

  assert.deepEqual(
    getAssessmentRiskTransferProgress(criterionStates, initialRiskEntryStatus),
    {
      eligibleCriteria: 0,
      transferredCriteria: 0,
      remainingCriteria: 0,
    },
  );

  const started = beginCriterionSave(criterionStates, "criterion-1", {
    status: "notOk",
    attentionSeverity: "large",
    notes: "Guard missing",
  });
  const saved = reconcileCriterionSaveSuccess(
    started.criterionStates,
    "criterion-1",
    started.requestId,
    createSaveResponse({
      status: "notOk",
      attentionSeverity: "large",
      notes: "Guard missing",
    }),
    {
      status: "notOk",
      attentionSeverity: "large",
      notes: "Guard missing",
    },
  );

  assert.deepEqual(
    getAssessmentRiskTransferProgress(saved, initialRiskEntryStatus),
    {
      eligibleCriteria: 1,
      transferredCriteria: 0,
      remainingCriteria: 1,
    },
  );
  assert.deepEqual(markTransferredRiskEntriesPresent(saved, initialRiskEntryStatus), {
    "criterion-1": "present",
    "criterion-2": "absent",
  });
});

test("unsaved draft answers do not advance persisted walkthrough or transfer progress", () => {
  const criterionStates = buildInitialCriterionState(sections);
  const initialRiskEntryStatus = buildInitialCriterionRiskEntryStatus(sections);
  const started = beginCriterionSave(criterionStates, "criterion-1", {
    status: "notOk",
    attentionSeverity: "large",
    notes: "Draft-only change",
  });

  assert.deepEqual(
    getAssessmentWalkthroughProgress(sections, started.criterionStates),
    {
      totalCriteria: 2,
      validCompletedCriteria: 1,
      needsAttentionCriteria: 0,
      completedSections: 0,
      progressPercentage: 50,
    },
  );
  assert.deepEqual(
    getAssessmentRiskTransferProgress(
      started.criterionStates,
      initialRiskEntryStatus,
    ),
    {
      eligibleCriteria: 0,
      transferredCriteria: 0,
      remainingCriteria: 0,
    },
  );
});

test("beginCriterionSave and reconcileCriterionSaveSuccess update saved state", () => {
  const initialState = buildInitialCriterionState(sections);
  const nextDraft = {
    status: "notOk",
    attentionSeverity: "large",
    notes: "Guard missing",
  } as const;
  const started = beginCriterionSave(initialState, "criterion-1", nextDraft);

  assert.equal(started.requestId, 1);
  assert.equal(started.criterionStates["criterion-1"]?.saveState, "saving");
  assert.equal(started.criterionStates["criterion-1"]?.draft.status, "notOk");

  const completed = reconcileCriterionSaveSuccess(
    started.criterionStates,
    "criterion-1",
    started.requestId,
    createSaveResponse({
      status: "notOk",
      attentionSeverity: "large",
      notes: "Guard missing",
    }),
    nextDraft,
  );

  assert.equal(completed["criterion-1"]?.saveState, "idle");
  assert.equal(completed["criterion-1"]?.saved.status, "notOk");
  assert.equal(completed["criterion-1"]?.saved.attentionSeverity, "large");
  assert.equal(completed["criterion-1"]?.saved.notes, "Guard missing");
  assert.equal(completed["criterion-1"]?.draft.status, "notOk");
});

test("controller preserves newer drafts and surfaces save failures", () => {
  const initialState = buildInitialCriterionState(sections);
  const started = beginCriterionSave(initialState, "criterion-1", {
    status: "ok",
    attentionSeverity: null,
    notes: "Original note",
  });
  const editedWhileSaving = updateCriterionDraftNotes(
    started.criterionStates,
    "criterion-1",
    "Edited after request",
  );

  const completed = reconcileCriterionSaveSuccess(
    editedWhileSaving,
    "criterion-1",
    started.requestId,
    createSaveResponse({
      status: "ok",
      notes: "Original note",
    }),
    {
      status: "ok",
      attentionSeverity: null,
      notes: "Original note",
    },
  );

  assert.equal(completed["criterion-1"]?.saved.notes, "Original note");
  assert.equal(completed["criterion-1"]?.draft.notes, "Edited after request");

  const failed = reconcileCriterionSaveFailure(
    completed,
    "criterion-1",
    started.requestId,
    "Save failed",
  );

  assert.equal(failed["criterion-1"]?.saveState, "error");
  assert.equal(failed["criterion-1"]?.errorMessage, "Save failed");
});

test("section summaries, recovery targets, and blockers follow the saved walkthrough contract", () => {
  const criterionStates = buildInitialCriterionState(sections);

  const invalidNotOk = {
    ...criterionStates,
    "criterion-1": {
      ...criterionStates["criterion-1"]!,
      draft: {
        status: "notOk" as const,
        attentionSeverity: null,
        notes: "",
      },
    },
  };
  const savedNeedsAttention = reconcileCriterionSaveSuccess(
    beginCriterionSave(criterionStates, "criterion-1", {
      status: "notOk",
      attentionSeverity: "medium",
      notes: "",
    }).criterionStates,
    "criterion-1",
    1,
    createSaveResponse({
      status: "notOk",
      attentionSeverity: "medium",
      notes: null,
    }),
    {
      status: "notOk",
      attentionSeverity: "medium",
      notes: "",
    },
  );

  assert.equal(
    getDraftWalkthroughItemState(invalidNotOk["criterion-1"]!),
    "notAnswered",
  );
  assert.equal(getNextBlocker(invalidNotOk["criterion-1"]!), "missingSeverity");
  assert.equal(
    getSavedWalkthroughItemState(savedNeedsAttention["criterion-1"]!),
    "needsAttention",
  );
  assert.deepEqual(
    getSectionWalkthroughSummary(sections[0]!.criteria, savedNeedsAttention),
    {
      itemState: "needsAttention",
      unansweredCount: 0,
      attentionCount: 1,
      validCompletedCount: 2,
    },
  );
  assert.equal(
    getRecoveryCriterionId(sections[0]!.criteria, savedNeedsAttention),
    "criterion-1",
  );
});
