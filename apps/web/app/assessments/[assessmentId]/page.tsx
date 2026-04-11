import React from "react";
import { notFound } from "next/navigation";
import { AssessmentAggregateNotFoundError } from "@vardi/db";

import { loadAssessmentReadiness } from "@/lib/assessments/loadAssessmentReadiness";
import { getDatabase } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/getCurrentUser";

interface AssessmentReadinessPageProps {
  readonly params: Promise<{
    readonly assessmentId: string;
  }>;
}

export default async function AssessmentReadinessPage({
  params,
}: AssessmentReadinessPageProps) {
  const { assessmentId } = await params;

  try {
    const readiness = loadAssessmentReadiness({
      db: getDatabase(),
      ownerId: getCurrentUser().id,
      assessmentId,
    });

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f3efe5_0%,#ebe2cf_100%)] px-6 py-10 text-slate-950">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          {/* S1-03 stops at readiness metadata; walkthrough UI and navigation truth start in later stories. */}
          <section className="rounded-[2rem] border border-black/10 bg-white/80 p-8 shadow-[0_24px_70px_rgba(28,29,24,0.12)] backdrop-blur">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
                Assessment Ready
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                {readiness.workplaceName}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-700">
                The assessment has been created and pinned to seeded runtime data.
                This page is a readiness checkpoint only. Walkthrough rendering and
                answer capture begin in S1-04.
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <ReadinessCard label="Checklist" value={readiness.checklistTitle} />
            <ReadinessCard label="Risk matrix" value={readiness.riskMatrixTitle} />
            <ReadinessCard label="Sections" value={`${readiness.sectionCount}`} />
            <ReadinessCard label="Criteria" value={`${readiness.criterionCount}`} />
          </section>
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof AssessmentAggregateNotFoundError) {
      notFound();
    }

    throw error;
  }
}

function ReadinessCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-white/75 px-5 py-5 shadow-[0_16px_40px_rgba(28,29,24,0.08)]">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}
