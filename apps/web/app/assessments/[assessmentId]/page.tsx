import React from "react";
import { notFound } from "next/navigation";
import { AssessmentAggregateNotFoundError } from "@vardi/db";

import { AssessmentSummaryEditor } from "./_components/AssessmentSummaryEditor";
import { AssessmentWalkthrough } from "./_components/AssessmentWalkthrough";
import { RiskRegisterEditor } from "./_components/RiskRegisterEditor";
import { loadAssessmentReadModel } from "@/lib/assessments/loadAssessmentReadModel";
import { loadAssessmentRiskRegisterProjection } from "@/lib/assessments/loadAssessmentRiskRegisterProjection";
import { loadAssessmentSummaryProjection } from "@/lib/assessments/loadAssessmentSummaryProjection";
import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

interface AssessmentWalkthroughPageProps {
  readonly params: Promise<{
    readonly assessmentId: string;
  }>;
}

export default async function AssessmentWalkthroughPage({
  params,
}: AssessmentWalkthroughPageProps) {
  const { assessmentId } = await params;

  try {
    const db = getDatabase();
    const ownerId = getCurrentUser().id;
    const readModel = loadAssessmentReadModel({
      db,
      ownerId,
      assessmentId,
    });
    const riskRegisterProjection = loadAssessmentRiskRegisterProjection({
      db,
      ownerId,
      assessmentId,
      readModel,
    });
    const summaryProjection = loadAssessmentSummaryProjection({
      db,
      ownerId,
      assessmentId,
      riskRegisterProjection,
    });

    return (
      <AssessmentWalkthrough
        assessmentId={readModel.assessment.id}
        checklistTitle={readModel.checklist.translations.is.title}
        checklistVersion={readModel.checklist.version}
        riskMatrixTitle={readModel.riskMatrix.translations.is.title}
        sections={readModel.sections}
        workplaceName={readModel.workplace.name}
        >
        <RiskRegisterEditor
          assessmentId={readModel.assessment.id}
          entries={riskRegisterProjection.entries}
          riskMatrixConsequenceLevels={
            riskRegisterProjection.riskMatrix.consequenceLevels
          }
          riskMatrixLikelihoodLevels={
            riskRegisterProjection.riskMatrix.likelihoodLevels
          }
          riskMatrixTitle={riskRegisterProjection.riskMatrix.title}
        />
        <AssessmentSummaryEditor
          assessmentId={readModel.assessment.id}
          prioritizedEntries={summaryProjection.prioritizedEntries}
          readiness={summaryProjection.readiness}
          summary={summaryProjection.summary}
        />
      </AssessmentWalkthrough>
    );
  } catch (error) {
    if (error instanceof AssessmentAggregateNotFoundError) {
      notFound();
    }

    throw error;
  }
}
