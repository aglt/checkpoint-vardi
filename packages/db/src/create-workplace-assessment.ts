import { randomUUID } from "node:crypto";

import type { VardiDatabase } from "./database.js";
import {
  finding,
  riskAssessment,
  workplace,
  workplaceArchetypes,
} from "./schema.js";

type WorkplaceArchetype = (typeof workplaceArchetypes)[number];

export interface CreateWorkplaceAssessmentParams {
  readonly db: VardiDatabase;
  readonly ownerId: string;
  readonly workplace: {
    readonly name: string;
    readonly address?: string;
    readonly archetype: WorkplaceArchetype;
    readonly primaryLanguage: string;
  };
  readonly assessment: {
    readonly checklistId: string;
    readonly checklistSlug: string;
    readonly checklistVersion: string;
    readonly riskMatrixId: string;
    readonly startedAt: Date;
  };
  readonly criterionIds: readonly string[];
}

export interface CreateWorkplaceAssessmentResult {
  readonly workplaceId: string;
  readonly assessmentId: string;
}

// This is the package-owned transactional write seam for assessment start.
export function createWorkplaceAssessment(
  params: CreateWorkplaceAssessmentParams,
): CreateWorkplaceAssessmentResult {
  return params.db.transaction((tx) => {
    const workplaceId = randomUUID();
    const assessmentId = randomUUID();

    tx.insert(workplace).values({
      id: workplaceId,
      ownerId: params.ownerId,
      name: params.workplace.name,
      address: params.workplace.address ?? null,
      archetype: params.workplace.archetype,
      primaryLanguage: params.workplace.primaryLanguage,
    }).run();

    tx.insert(riskAssessment).values({
      id: assessmentId,
      ownerId: params.ownerId,
      workplaceId,
      checklistId: params.assessment.checklistId,
      checklistSlug: params.assessment.checklistSlug,
      checklistVersion: params.assessment.checklistVersion,
      riskMatrixId: params.assessment.riskMatrixId,
      status: "draft",
      startedAt: params.assessment.startedAt,
      completedAt: null,
    }).run();

    tx.insert(finding).values(
      params.criterionIds.map((criterionId) => ({
        id: randomUUID(),
        ownerId: params.ownerId,
        assessmentId,
        criterionId,
        status: "unanswered" as const,
        notes: null,
        voiceTranscript: null,
        notesLanguage: null,
        createdAt: params.assessment.startedAt,
        updatedAt: params.assessment.startedAt,
      })),
    ).run();

    return {
      workplaceId,
      assessmentId,
    };
  });
}
