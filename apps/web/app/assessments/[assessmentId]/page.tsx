import React from "react";
import { notFound } from "next/navigation";
import { AssessmentAggregateNotFoundError } from "@vardi/db";

import { AssessmentWalkthrough } from "./_components/AssessmentWalkthrough";
import { loadAssessmentReadModel } from "@/lib/assessments/loadAssessmentReadModel";
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
    const readModel = loadAssessmentReadModel({
      db: getDatabase(),
      ownerId: getCurrentUser().id,
      assessmentId,
    });

    return (
      <AssessmentWalkthrough
        assessmentId={readModel.assessment.id}
        checklistTitle={readModel.checklist.translations.is.title}
        checklistVersion={readModel.checklist.version}
        riskMatrixTitle={readModel.riskMatrix.translations.is.title}
        sections={readModel.sections}
        workplaceName={readModel.workplace.name}
      />
    );
  } catch (error) {
    if (error instanceof AssessmentAggregateNotFoundError) {
      notFound();
    }

    throw error;
  }
}
