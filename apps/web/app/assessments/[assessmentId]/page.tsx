import React from "react";
import { notFound } from "next/navigation";
import { AssessmentAggregateNotFoundError } from "@vardi/db";

import { AssessmentProgressionProvider } from "./_components/AssessmentProgressionContext";
import { AssessmentSummaryEditor } from "./_components/AssessmentSummaryEditor";
import { AssessmentWalkthrough } from "./_components/AssessmentWalkthrough";
import { RiskRegisterEditor } from "./_components/RiskRegisterEditor";
import { loadAssessmentProgressionProjection } from "@/lib/assessments/loadAssessmentProgressionProjection";
import { loadAssessmentReadModel } from "@/lib/assessments/loadAssessmentReadModel";
import { loadAssessmentRiskRegisterProjection } from "@/lib/assessments/loadAssessmentRiskRegisterProjection";
import { loadAssessmentSummaryProjection } from "@/lib/assessments/loadAssessmentSummaryProjection";
import { getRequestAppLanguage } from "@/lib/i18n/requestAppLanguage.server";
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
    const language = await getRequestAppLanguage();
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
      readModel,
      riskRegisterProjection,
    });
    const progression = loadAssessmentProgressionProjection({
      db,
      ownerId,
      assessmentId,
      readModel,
      riskRegisterProjection,
      summaryProjection,
    });

    return (
      <AssessmentProgressionProvider
        assessmentId={readModel.assessment.id}
        initialProgression={progression}
        initialSummaryPrioritizedEntries={summaryProjection.prioritizedEntries}
      >
        <AssessmentWalkthrough
          assessmentId={readModel.assessment.id}
          checklistTitle={readModel.checklist.translations.is.title}
          language={language}
          sections={readModel.sections}
          workplaceName={readModel.workplace.name}
        >
          <RiskRegisterEditor
            assessmentId={readModel.assessment.id}
            entries={riskRegisterProjection.entries}
            language={language}
            riskMatrixSeverityChoices={
              riskRegisterProjection.riskMatrix.severityChoices
            }
            riskMatrixTitle={riskRegisterProjection.riskMatrix.title}
          />
          <AssessmentSummaryEditor
            assessmentId={readModel.assessment.id}
            language={language}
            summary={summaryProjection.summary}
          />
        </AssessmentWalkthrough>
      </AssessmentProgressionProvider>
    );
  } catch (error) {
    if (error instanceof AssessmentAggregateNotFoundError) {
      notFound();
    }

    throw error;
  }
}
