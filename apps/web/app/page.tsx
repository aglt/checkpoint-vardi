import React from "react";
import { listSeedChecklists } from "@vardi/checklists";

const FORM_ERROR_MESSAGES = {
  "invalid-start-request": "The start request was incomplete. Please check the form and try again.",
  "unknown-template": "The selected seeded template is not available anymore.",
  "start-unavailable": "Assessment start is temporarily unavailable.",
} as const;

interface StartAssessmentPageProps {
  readonly searchParams?: Promise<{
    readonly error?: string | readonly string[];
  }>;
}

export default async function StartAssessmentPage({
  searchParams,
}: StartAssessmentPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorCode = resolveErrorCode(resolvedSearchParams?.error);
  const templates = listSeedChecklists();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(145,171,127,0.24),transparent_38%),linear-gradient(180deg,#f6f1e5_0%,#efe6d4_52%,#e5dcc9_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/75 shadow-[0_30px_80px_rgba(28,29,24,0.12)] backdrop-blur">
          <div className="grid gap-8 p-6 md:grid-cols-[1.05fr_0.95fr] md:p-10">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
                Current MVP Start Entry
              </p>
              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  Start a seeded assessment and leave the walkthrough for the next step.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700">
                  This screen is the narrow MVP entry route for S1-03. It creates
                  a workplace context, pins a seeded checklist and the course 3x3
                  matrix, and prepares the assessment for the walkthrough flow.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryCard label="Templates" value={`${templates.length}`} />
                <SummaryCard label="Pinned matrix" value="Course 3x3" />
                <SummaryCard label="Scope" value="Start only" />
              </div>
            </div>

            <section className="rounded-[1.75rem] border border-black/10 bg-[#f8f4ea] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] md:p-6">
              <div className="mb-5 space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Start assessment
                </h2>
                <p className="text-sm leading-6 text-slate-700">
                  Choose a workplace context and one of the seeded templates below.
                  This form intentionally skips matrix choice, compatibility rules,
                  and walkthrough content.
                </p>
              </div>

              {errorCode ? (
                <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  {FORM_ERROR_MESSAGES[errorCode]}
                </div>
              ) : null}

              <form action="/api/assessments" className="space-y-5" method="post">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900" htmlFor="workplaceName">
                    Workplace name
                  </label>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none ring-0 transition focus:border-slate-500"
                    id="workplaceName"
                    name="workplaceName"
                    placeholder="FB workshop"
                    required
                    type="text"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900" htmlFor="workplaceAddress">
                    Address
                  </label>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none ring-0 transition focus:border-slate-500"
                    id="workplaceAddress"
                    name="workplaceAddress"
                    placeholder="Austurberg 5"
                    type="text"
                  />
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-slate-900">
                    Workplace archetype
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ArchetypeOption
                      defaultChecked
                      description="Steady site with slower operational change."
                      label="Fixed"
                      value="fixed"
                    />
                    <ArchetypeOption
                      description="Crew or equipment moves between work locations."
                      label="Mobile"
                      value="mobile"
                    />
                    <ArchetypeOption
                      description="Construction-focused environment with changing conditions."
                      label="Construction"
                      value="construction"
                    />
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-slate-900">
                    Seeded template
                  </legend>
                  <div className="grid gap-3">
                    {templates.map((template, index) => (
                      <label
                        className="group flex cursor-pointer items-start justify-between gap-4 rounded-[1.5rem] border border-black/10 bg-white px-4 py-4 transition hover:border-slate-400 hover:bg-slate-50"
                        key={template.id}
                      >
                        <div className="space-y-1">
                          <div className="text-base font-semibold text-slate-950">
                            {template.translations.is.title}
                          </div>
                          <div className="text-sm text-slate-700">
                            {template.sections} sections · {template.criteria} criteria
                          </div>
                          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                            {template.slug} · v{template.version}
                          </div>
                        </div>
                        <input
                          className="mt-1 size-4 accent-slate-900"
                          defaultChecked={index === 0}
                          name="checklistId"
                          required
                          type="radio"
                          value={template.id}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>

                <button
                  className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="submit"
                >
                  Create assessment
                </button>
              </form>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function resolveErrorCode(value: string | readonly string[] | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  if (value in FORM_ERROR_MESSAGES) {
    return value as keyof typeof FORM_ERROR_MESSAGES;
  }

  return null;
}

function SummaryCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-[#fcfaf4] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function ArchetypeOption({
  defaultChecked = false,
  description,
  label,
  value,
}: {
  readonly defaultChecked?: boolean;
  readonly description: string;
  readonly label: string;
  readonly value: "fixed" | "mobile" | "construction";
}) {
  return (
    <label className="flex cursor-pointer flex-col gap-3 rounded-[1.5rem] border border-black/10 bg-white px-4 py-4 transition hover:border-slate-400 hover:bg-slate-50">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-950">{label}</span>
        <input
          className="size-4 accent-slate-900"
          defaultChecked={defaultChecked}
          name="workplaceArchetype"
          type="radio"
          value={value}
        />
      </div>
      <p className="text-sm leading-6 text-slate-700">{description}</p>
    </label>
  );
}
