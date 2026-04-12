"use client";

import React, {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { loadAssessmentProgressionAction } from "@/lib/assessments/loadAssessmentProgressionAction";
import { loadAssessmentSummaryPrioritizedEntriesAction } from "@/lib/assessments/loadAssessmentSummaryPrioritizedEntriesAction";
import type { AssessmentProgressionProjection } from "@/lib/assessments/loadAssessmentProgressionProjection";
import type { AssessmentSummaryPrioritizedEntry } from "@/lib/assessments/assessmentSummaryPriorityEntries";

interface AssessmentProgressionContextValue {
  readonly progression: AssessmentProgressionProjection;
  readonly summaryPrioritizedEntries: readonly AssessmentSummaryPrioritizedEntry[];
  readonly refreshProgression: () => Promise<void>;
  readonly refreshSummary: () => Promise<void>;
}

const AssessmentProgressionContext =
  createContext<AssessmentProgressionContextValue | null>(null);

export function AssessmentProgressionProvider({
  assessmentId,
  children,
  initialProgression,
  initialSummaryPrioritizedEntries,
}: {
  readonly assessmentId: string;
  readonly children: React.ReactNode;
  readonly initialProgression: AssessmentProgressionProjection;
  readonly initialSummaryPrioritizedEntries: readonly AssessmentSummaryPrioritizedEntry[];
}) {
  const [progression, setProgression] =
    useState<AssessmentProgressionProjection>(initialProgression);
  const [summaryPrioritizedEntries, setSummaryPrioritizedEntries] = useState<
    readonly AssessmentSummaryPrioritizedEntry[]
  >(initialSummaryPrioritizedEntries);

  useEffect(() => {
    setProgression(initialProgression);
  }, [initialProgression]);

  useEffect(() => {
    setSummaryPrioritizedEntries(initialSummaryPrioritizedEntries);
  }, [initialSummaryPrioritizedEntries]);

  const value = useMemo<AssessmentProgressionContextValue>(
    () => ({
      progression,
      summaryPrioritizedEntries,
      refreshProgression: async () => {
        try {
          const nextProgression = await loadAssessmentProgressionAction({
            assessmentId,
          });

          startTransition(() => {
            setProgression(nextProgression);
          });
        } catch (error) {
          console.error("Progression refresh failed", {
            assessmentId,
            error,
          });
        }
      },
      refreshSummary: async () => {
        try {
          const nextPrioritizedEntries =
            await loadAssessmentSummaryPrioritizedEntriesAction({
              assessmentId,
            });

          startTransition(() => {
            setSummaryPrioritizedEntries(nextPrioritizedEntries);
          });
        } catch (error) {
          console.error("Summary refresh failed", {
            assessmentId,
            error,
          });
        }
      },
    }),
    [assessmentId, progression, summaryPrioritizedEntries],
  );

  return (
    <AssessmentProgressionContext.Provider value={value}>
      {children}
    </AssessmentProgressionContext.Provider>
  );
}

export function useAssessmentProgression() {
  const context = useContext(AssessmentProgressionContext);

  if (!context) {
    throw new Error(
      "useAssessmentProgression must be used within AssessmentProgressionProvider.",
    );
  }

  return context;
}
