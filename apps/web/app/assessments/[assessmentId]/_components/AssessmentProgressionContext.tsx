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
import type { AssessmentProgressionProjection } from "@/lib/assessments/loadAssessmentProgressionProjection";

interface AssessmentProgressionContextValue {
  readonly progression: AssessmentProgressionProjection;
  readonly refreshProgression: () => Promise<void>;
}

const AssessmentProgressionContext =
  createContext<AssessmentProgressionContextValue | null>(null);

export function AssessmentProgressionProvider({
  assessmentId,
  children,
  initialProgression,
}: {
  readonly assessmentId: string;
  readonly children: React.ReactNode;
  readonly initialProgression: AssessmentProgressionProjection;
}) {
  const [progression, setProgression] =
    useState<AssessmentProgressionProjection>(initialProgression);

  useEffect(() => {
    setProgression(initialProgression);
  }, [initialProgression]);

  const value = useMemo<AssessmentProgressionContextValue>(
    () => ({
      progression,
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
    }),
    [assessmentId, progression],
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
