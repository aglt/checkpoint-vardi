**System Design Document**

Workplace Safety Management Platform

*Archived alternate-name draft*

*A reusable platform for statutory Icelandic workplace risk assessments
and the broader written safety plan.*

Version 2.0 --- Revised Draft

Prepared for: Ægir Laufdal

Date: 11 April 2026

*Status: Design phase --- pending implementation*

**1. Revision Summary**

This revision folds in three material changes from the preceding draft
and validates the specification against the complete corpus of source
material supplied with the course assignment Verkefni IV at
Fjölbrautaskólinn í Breiðholti.

**1.1 Changes from version 1.0**

-   The frontend is collapsed into a single responsive Next.js
    application that serves both desktop operator use and mobile field
    capture. The previously proposed three-application split is
    withdrawn as over-engineering for the current user base.

-   Authentication is explicitly deferred to a later stage. A
    single-owner placeholder pattern is specified so that the schema,
    repositories, and API surface are authorisation-ready without
    introducing an identity provider in the current release.

-   The product scope is widened from a narrow risk-assessment tool to a
    reusable Workplace Safety Management Platform that implements the
    full written safety plan required by Icelandic occupational safety
    regulations. The current course assignment becomes the first
    concrete use case of this broader platform rather than the upper
    bound of its design.

**1.2 Summary of validation findings**

A detailed review of the eight documents supplied for Verkefni IV
confirmed that the previously proposed data model and workflow cover the
three deliverables the student must submit, but they did not cover
several other artefacts that the same statutory framework expects every
workplace to produce and maintain. Sections 4, 6, 9, and 10 of this
revised document address those gaps.

Specifically, the platform must also support an accident and near-miss
log, a chemical inventory with safety data sheets, an emergency plan, a
harassment policy with an incident response flow, a training plan for
new and foreign workers, a configurable risk matrix, and a formal
follow-up mechanism that treats the written safety plan as a living
document subject to scheduled and event-driven review. These additions
are load-bearing for compliance with Act 46/1980 and Regulation
920/2006, and several of them are explicitly required by Regulation
1009/2015 and Regulation 547/1996.

**2. Executive Summary**

Checkpoint Vardi is a web application for preparing, maintaining, and producing
the written safety plan that Icelandic law requires of every workplace.
It operationalises the statutory six-step risk assessment methodology
issued by Vinnueftirlitið (the Administration of Occupational Safety and
Health), digitises the forty-eight sectoral checklists published by the
agency, and produces submission-ready deliverables that match the exact
templates used by educators and inspectors.

The platform is deliberately designed to be reusable across many
contexts. The first concrete use case is a student completing Verkefni
IV of the course Framkvæmdir og vinnuvernd at Fjölbrautaskólinn í
Breiðholti. Subsequent use cases include safety officers at small and
medium enterprises who maintain rolling risk assessments, site foremen
capturing findings in the field, and future students who reuse the
platform for assignments that have not yet been written. No aspect of
the system is hard-coded to any specific assignment; the course
assignment is represented as data, not code.

The system is specified as a single responsive Next.js 15 web
application with a shared TypeScript monorepo for typed data contracts,
a relational store, a pure risk matrix library, and a template-driven
document generator. Long-running or model-heavy workloads --- speech
recognition for Icelandic and fidelity-critical conversion of Word
documents to PDF --- are delegated to a containerised Python sidecar
service so that the main application stack remains lightweight and
portable.

**3. Regulatory and Domain Background**

The legal foundation for the platform is Act No. 46/1980 on working
conditions, health, and safety in workplaces. Regulation No. 920/2006 on
the organisation and implementation of occupational safety and health
work elaborates the act and obliges every employer to maintain a written
plan covering safety and health. The written plan is a container for
several specific artefacts; the platform must support every artefact the
plan is required to contain.

**3.1 Composition of the written safety plan**

The written safety plan required by Regulation 920/2006 and its sister
regulations is an umbrella document. Its constituent parts, all of which
are mandatory, are enumerated below together with their regulatory
anchors. The platform must treat each of these as a first-class entity
rather than conflating them with the risk assessment.

  --------------------------------------- -------------------------------------------------------------------------------------------------------------------- -----------------------------------------
  **Artefact**                            **Purpose**                                                                                                          **Regulatory anchor**
  Risk assessment                         Systematic identification, evaluation, and classification of hazards.                                                L 46/1980, Rg 920/2006
  Health protection and prevention plan   Time-bounded action plan derived from the risk assessment, with owners, due dates, and outcome records.              Rg 920/2006
  Emergency plan                          Procedures for first aid, firefighting, and evacuation.                                                              Rg 920/2006
  Harassment policy and response plan     Policy and response flow for bullying, sexual harassment, gender-based harassment, and workplace violence.           Rg 1009/2015
  Accident and near-miss log              Mandatory record of all accidents and near-misses, with statutory reporting to Vinnueftirlitið.                      L 46/1980 (§§78--80), Rg 920/2006 (§30)
  Chemical inventory                      Register of hazardous substances on site, with sixteen-point safety data sheets in a language workers understand.    Rg 553/2004, Rg 530/2020
  Training plan                           Structured induction and ongoing training, including explicit provision for foreign workers in their own language.   L 46/1980 §14, Rg 920/2006 §25
  Follow-up and review                    Scheduled review of the plan and event-driven re-assessment after incidents or material changes.                     Rg 920/2006
  --------------------------------------- -------------------------------------------------------------------------------------------------------------------- -----------------------------------------

**3.2 The six-step risk assessment methodology**

The canonical method published by Vinnueftirlitið organises the risk
assessment into six steps. The platform implements these steps directly
and uses their names both in the internal terminology of the product and
in the structure of the exported documents. The steps are identification
of hazards through walk-through and checklist use, transfer of
non-compliant findings onto the register, description of possible health
effects, classification of risk severity, definition of corrective
actions, and written summary prioritised by severity.

**3.3 Categories of hazard to be assessed**

Regulation 920/2006 and the agency\'s training material together
identify the categories of hazard that a competent risk assessment must
address. The platform does not invent these categories; it inherits them
from the checklists published by the agency. The principal categories
are environmental factors such as lighting, temperature, noise,
vibration, and indoor climate; chemical substances and exposures;
musculoskeletal load and ergonomic workstation design; machinery and
technical equipment; psychosocial factors including bullying,
harassment, time pressure, and psychological safety; and fire safety.
The platform supports arbitrary additional categories because each
published checklist is free to introduce its own.

**3.4 The three workplace archetypes**

The agency\'s guidance distinguishes three kinds of workplace for the
purpose of risk assessment, and the platform\'s data model reflects the
distinction because it affects how templates are selected, how often
reviews are scheduled, and how findings are grouped. The archetypes are
fixed-location workplaces such as offices, factories, and schools where
conditions change slowly; mobile workplaces such as repair, inspection,
and field-service operations where the crew moves between sites; and
time-limited construction projects where the environment itself is under
constant change, as specifically governed by Regulation 547/1996.

**4. Requirements Validation Against Source Material**

This section maps every concrete requirement extracted from the eight
documents supplied for Verkefni IV onto a system capability. The purpose
is to confirm that the specification is complete with respect to the
assignment and identify any capability that still belongs to the
backlog.

**4.1 Traceability matrix**

  --------------------------------------------------------------------------------------------------------- ---------------------------------------- ------------------------------------------------------------------------------------------------
  **Source requirement**                                                                                    **Source**                               **System capability**
  Select one of three workplace archetypes to assess.                                                       Verkefni IV brief                        Project creation with workplace type.
  Walk through the site and record observations on a sector-specific checklist (vinnuumhverfisvísir).       Verkefni IV brief; training PDF          Checklist navigator with status controls per criterion and free-text notes.
  Support photographic evidence at the point of observation.                                                Verkefni IV brief (recommended)          Photo attachments on each finding with capture-time geolocation.
  Classify each flagged finding on a Low/Medium/High risk scale using a likelihood-by-consequence matrix.   Training PDF §8; guidance PDF §8         Configurable risk matrix library with 2×2, 3×3, and 5×5 defaults and a pluggable lookup table.
  Fill and submit the statutory register form (Skráning og aðgerðaáætlun).                                  Verkefni IV brief; register PDF          Risk register entity with all header fields and template-driven DOCX export.
  Fill and submit the six-step summary form (Samantekt).                                                    Verkefni IV brief; summary PDF           Summary entity with all five header fields and template-driven DOCX export.
  Produce the filled checklist as a separate deliverable.                                                   Verkefni IV brief                        Checklist DOCX export that reflects the live state of all findings.
  Use woodworking-workshop checklist for the FB smiðja option.                                              Verkefni IV brief                        Seeded template parsed from the file supplied in the assignment folder.
  Use construction-site checklist for the Austurberg option.                                                Verkefni IV brief                        Seeded template parsed from the file supplied in the assignment folder.
  Use an arbitrary checklist for the student\'s own workplace option.                                       Verkefni IV brief                        Importer that ingests any DOCX checklist published by Vinnueftirlitið.
  Attach references to cited Icelandic legal instruments for each criterion.                                Both seed vísar                          Legal reference vocabulary with codes, optional URLs, and translated titles.
  Follow the six-step methodology end to end.                                                               Training PDF §§1a--6                     Workflow explicitly labelled by step and mirrored in export outputs.
  Enable collaboration between student and teammates.                                                       Verkefni IV brief (shared assignments)   Multi-contributor seam on every user-content entity, pending auth introduction.
  --------------------------------------------------------------------------------------------------------- ---------------------------------------- ------------------------------------------------------------------------------------------------

**4.2 Requirements originating outside the assignment but relevant to
the wider platform**

The regulatory corpus referenced by the assignment imposes additional
requirements that the assignment itself does not directly exercise, but
that any honest workplace-safety platform must satisfy. The platform
treats these as first-class even though Stage One of the delivery plan
does not expose all of them.

-   Mandatory accident and near-miss reporting and a standing register
    available to the employer and the agency.

-   Chemical inventory with sixteen-point safety data sheets available
    in a language every worker understands.

-   Standing harassment policy and documented response protocol.

-   Emergency plan with first aid, firefighting, and evacuation
    procedures.

-   Structured training plan that differentiates induction from ongoing
    training and provides for foreign workers in their own language.

-   A follow-up mechanism treating the plan as a living document, with
    scheduled reviews and mandatory re-assessment after accidents or
    material change.

**Validation verdict**

The version 1.0 design is sufficient for the student to complete
Verkefni IV if and only if the Stage One delivery target includes the
register, summary, and filled checklist exports. It is not sufficient
for the broader written safety plan the regulations require, and that
gap must be closed in the Stage Two and Stage Three backlogs before the
platform can be used in a compliance role at a real workplace. The
revised architecture described below accommodates both horizons without
rework.

**5. Users and Use Cases**

**5.1 Personas**

**5.1.1 The student**

A vocational-school student performing Verkefni IV or any future
assignment of similar shape. The student is usually working alone, at
home on a laptop and at the workplace on a phone. They need strong
in-line guidance, exports that match the instructor\'s expected
templates exactly, and a clear path from first walk-through to final
submission.

**5.1.2 The safety officer**

A designated safety representative at a small or medium enterprise. They
maintain a standing written safety plan, perform scheduled reviews,
respond to incidents, keep the chemical inventory current, and generate
compliance artefacts on demand. Reusability of prior assessments and
visibility of outstanding actions are the primary value levers for this
persona.

**5.1.3 The site foreman**

A foreman on an active construction site governed by Regulation
547/1996. They capture findings on a phone, often gloved and in poor
connectivity. They file accident reports in the moment, propose
corrective actions in the field, and expect the platform to keep working
without a signal.

**5.1.4 The future student**

Every future student who will be assigned any task of this family.
Because the platform treats checklists, templates, risk matrices, and
export documents as data, future students require no new code to use it
--- they simply select a different template and follow the same flow.

**5.2 Primary use cases**

-   Create a written safety plan for a workplace and choose one or more
    applicable checklists.

-   Walk through every criterion, marking compliance, recording notes,
    capturing photographs, and optionally dictating by voice.

-   For each non-compliant finding, record a structured risk entry with
    likelihood, consequence, derived risk level, current controls,
    proposed actions, owner, and target date.

-   Record an accident or near-miss at the moment it happens; link it
    back to the risk assessment and trigger a review.

-   Maintain the chemical inventory with safety data sheet references
    and language coverage.

-   Maintain the emergency plan, harassment policy, and training plan as
    versioned documents attached to the safety plan.

-   Export the submission bundle for the current assessment as a ZIP
    containing the filled checklist, the register, and the summary in
    both DOCX and PDF.

-   Schedule periodic reviews of the plan and perform event-driven
    reviews when a new accident is logged or a material change is
    recorded.

-   Clone a prior safety plan for a recurring assessment of the same
    workplace and surface what has changed since last time.

-   Import new checklists published by Vinnueftirlitið and keep the
    local catalogue current.

**6. Architecture Overview**

The platform is organised as a TypeScript monorepo managed by pnpm
workspaces. It contains one responsive web application, one Python
sidecar service for heavy document and audio workloads, and a set of
shared packages that encapsulate the data layer, the type-safe API
contracts, the risk matrix logic, and the document generator. The entire
stack runs locally under Docker Compose and deploys as independent
containers in any standard cloud environment.

**6.1 Component map**

  --------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------
  **Component**         **Responsibility**                                                                                                                                                                                                                                                                           **Technology**
  apps/web              The single responsive application. Hosts the project list, safety plan editor, checklist navigator, risk register, accident log, chemical inventory, policies, training plan, review scheduler, dashboards, imports, exports, and settings. Adapts layout to desktop or mobile at runtime.   Next.js 15, React 19, Tailwind 4, TanStack Query, Recharts, Headless UI, Sonner, Lucide.
  services/doc-worker   Stateless sidecar. Parses DOCX checklists into JSON, transcribes audio with faster-whisper, and converts DOCX documents to PDF using LibreOffice in headless mode.                                                                                                                           Python 3.12, FastAPI, python-docx, faster-whisper, LibreOffice.
  packages/ui           Shared design system based on shadcn patterns, Radix primitives, CVA variants, Tailwind utilities.                                                                                                                                                                                           React 19, Tailwind 4.
  packages/schemas      Single source of truth for all data contracts, shared between client and server. Defines language enum, risk matrix shapes, entity shapes, and API request and response types.                                                                                                               Zod.
  packages/db           Schema, migrations, typed queries, seed runner, and repository functions. Every repository function takes an explicit owner identifier.                                                                                                                                                      Drizzle ORM, better-sqlite3 locally, Postgres in hosted deployments.
  packages/risk         Pure risk-matrix logic. Accepts pluggable matrix configurations. Exhaustively unit-tested.                                                                                                                                                                                                   TypeScript, Vitest.
  packages/export       Template-driven document generation for every statutory deliverable.                                                                                                                                                                                                                         docxtemplater.
  packages/checklists   TypeScript bridge to the Python parser, plus the importer that ingests new checklists from Vinnueftirlitið.                                                                                                                                                                                  TypeScript.
  --------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------

**6.2 Why a single application**

The previous version of this document proposed three separate frontends
on the grounds that public, operator, and field surfaces have different
performance and layout profiles. For the current and foreseeable user
base, that split is over-engineering. A single Next.js 15 application
with responsive Tailwind layouts and a purpose-built field-capture route
handles every surface with less code, a single deployment, and a single
authentication seam when identity is eventually introduced. The
field-capture view is reached by a dedicated URL path that presents a
full-screen mobile layout with large touch targets, prominent microphone
and camera controls, and aggressive offline queueing. Nothing about this
layout requires a separate build.

**6.3 Why a Python sidecar**

Two specific workloads do not have satisfactory native Node equivalents.
Accurate speech recognition for Icelandic domain vocabulary requires
faster-whisper running a large model, which is straightforward in Python
and materially inferior in Node. Faithful conversion of Word documents
to PDF requires LibreOffice in headless mode, which any language must
shell out to and which benefits from being containerised alongside its
Python wrapper. Isolating both workloads in a single stateless sidecar
keeps their heavy dependencies out of the main application stack and
allows them to be scaled, replaced, or replaced by cloud services
without disturbing the rest of the system.

**7. Data Model**

The data model separates language-neutral structural entities from
translatable content and explicitly recognises that the written safety
plan is a container for several distinct artefacts. Language-neutral
tables hold identifiers, relationships, ordering, and codes that are
invariant across languages. Translatable content is stored in sibling
translation tables, each keyed by the owning entity\'s identifier and a
two-letter ISO 639-1 language code. The platform supports Icelandic,
English, and Polish from the first migration.

**7.1 Top-level container**

The top-level entity is the safety plan. A safety plan belongs to a
workplace and exists independently of any single risk assessment. Over
time, a single safety plan may contain many assessments, many accident
reports, many chemical inventory revisions, many policy versions, and an
evolving training plan. The risk assessment used for Verkefni IV is
therefore one of many possible risk assessments inside a single safety
plan.

**7.2 Entity catalogue**

  ------------------------------ -------------- ----------------------------------------------------------------------------------------------------------------------------------------------------
  **Entity**                     **Kind**       **Purpose**
  workplace                      Structural     A physical or logical place of work. Holds name, address, archetype (fixed, mobile, construction), and primary language.
  safetyPlan                     Structural     The top-level container for a workplace\'s written safety plan. Holds status, creation and revision dates, and the review cadence.
  riskAssessment                 Structural     A single assessment event inside a safety plan. Holds the selected checklists, the effective risk-matrix configuration, and the assessment window.
  checklistTemplate              Structural     A published sectoral checklist. Holds slug, source URL, version, and import timestamp.
  checklistTemplateTranslation   Content        Per-language title of a checklist.
  section                        Structural     An ordered section inside a checklist.
  sectionTranslation             Content        Per-language title of a section.
  criterion                      Structural     An ordered question or requirement inside a section. Holds numbering, category, and the legal reference codes it cites.
  criterionTranslation           Content        Per-language title and guidance text for a criterion.
  legalReference                 Structural     Closed vocabulary of cited legal codes with optional external URL.
  legalReferenceTranslation      Content        Per-language title and short title for a legal reference.
  finding                        User content   The assessor\'s answer for a single criterion within an assessment. Holds status, notes, voice transcript, author language, and timestamps.
  photo                          User content   Photographic attachment to a finding with optional geolocation and capture time.
  riskEntry                      User content   Structured risk record for any non-compliant finding, including likelihood, consequence, derived level, controls, actions, owner, and dates.
  summary                        User content   The six-step summary prepared for export.
  riskMatrix                     Structural     Configurable matrix defining likelihood and consequence axes and the lookup that projects onto risk levels.
  accident                       User content   Accident or near-miss log entry with type, date, severity, description, photographs, and links to the criteria it should trigger review of.
  chemical                       User content   Chemical inventory entry with CAS number, hazard statements, storage location, quantity, and SDS attachments.
  sdsAttachment                  User content   Safety data sheet file attached to a chemical, with language tag and version.
  emergencyPlan                  User content   Current emergency plan for a safety plan, with evacuation routes, first aid resources, and fire suppression notes.
  policy                         User content   Named policy document such as harassment policy, with body, effective date, and version history.
  incident                       User content   Reported harassment or violence incident with anonymised tracking, status, and linked response actions.
  trainingPlan                   User content   Training programme with induction and ongoing modules, per-language coverage, and assignment to employees.
  reviewEvent                    User content   A scheduled or event-driven review of the safety plan, with trigger, assigned reviewer, due date, outcome, and resulting changes.
  user                           Structural     Placeholder identity record. Seeded with a single local user until authentication is introduced.
  ------------------------------ -------------- ----------------------------------------------------------------------------------------------------------------------------------------------------

**7.3 Language model**

A single enum lists supported languages. Every translatable entity has a
dedicated translation table whose primary key is a composite of the
owning entity identifier and the language code. Read helpers prefer the
requested language and fall back deterministically to Icelandic if a
translation is missing. Writes accept partial translations so a
contributor can supply an English title for a checklist without being
forced to supply English for every criterion inside it.

type Language = \'is\' \| \'en\' \| \'pl\';\
\
export const criterion = sqliteTable(\'criterion\', {\
id: text(\'id\').primaryKey(),\
sectionId: text(\'section\_id\').notNull().references(() =\>
section.id),\
order: integer(\'order\').notNull(),\
number: text(\'number\').notNull(),\
category: text(\'category\').notNull(),\
legalRefs: text(\'legal\_refs\', { mode: \'json\'
}).\$type\<string\[\]\>().notNull(),\
});\
\
export const criterionTranslation =
sqliteTable(\'criterion\_translation\', {\
criterionId: text(\'criterion\_id\').notNull().references(() =\>
criterion.id),\
language: text(\'language\').\$type\<Language\>().notNull(),\
title: text(\'title\').notNull(),\
guidance: text(\'guidance\').notNull(),\
}, (t) =\> ({ pk: primaryKey({ columns: \[t.criterionId, t.language\] })
}));

**7.4 Naming discipline**

Every structural identifier --- table, column, enum, type, function,
component, route --- is expressed in English. Every content value ---
criterion text, guidance, section titles, legal reference titles, policy
bodies, export template copy --- is stored in the language it was
authored in. User-facing labels for enum values such as finding status
and risk level are mapped to localised strings by a single dictionary in
the shared UI package. This separation keeps the codebase reviewable by
non-Icelandic contributors and makes localisation a purely data-layer
concern.

**7.5 Risk matrix as data**

The risk matrix is a pluggable configuration rather than a code branch.
Each matrix declares its likelihood axis, its consequence axis, and a
lookup table that maps every cell to a risk level. The platform ships
with three defaults: a 2×2 matrix for the smallest workplaces, a 3×3
matrix matching the configuration used in course material, and a 5×5
matrix matching the configuration in the agency\'s guidance.
Administrators can clone any default matrix and modify it without a
schema change. A risk assessment always stores the identifier of the
matrix that was effective at the time of assessment so historic scores
remain meaningful after a matrix is revised.

export const riskMatrix = sqliteTable(\'risk\_matrix\', {\
id: text(\'id\').primaryKey(),\
slug: text(\'slug\').notNull().unique(),\
likelihoodLevels: integer(\'likelihood\_levels\').notNull(),\
consequenceLevels: integer(\'consequence\_levels\').notNull(),\
lookup: text(\'lookup\', { mode: \'json\'
}).\$type\<RiskLookup\>().notNull(),\
});\
\
// Lookup example for a 3x3 matrix\
// { \"1,1\": \"low\", \"1,2\": \"low\", \"1,3\": \"medium\",\
// \"2,1\": \"low\", \"2,2\": \"medium\", \"2,3\": \"high\",\
// \"3,1\": \"medium\", \"3,2\": \"high\", \"3,3\": \"high\" }

Risk level is always computed server-side from the stored likelihood and
consequence and the effective matrix. The client never submits the level
and the server never trusts it when received.

**7.6 Ownership, authorisation seam, and the deferred auth decision**

Every entity that holds user data carries an ownerId column from the
first migration. Until authentication is introduced, ownerId is
populated with the identifier of a single placeholder user that is
created by the initial seed. A single helper named getCurrentUser is the
only place in the codebase that resolves the current owner. In the
current release this helper returns the placeholder. When authentication
is introduced, this single helper is swapped to verify an identity token
and return the real user; no other code changes. No component, query, or
route handler ever hard-codes the placeholder identifier, and no
repository function reads the owner from a global. This is the entire
authentication seam.

**8. Risk Assessment Methodology**

The platform implements the six-step methodology published by
Vinnueftirlitið without substitution or simplification. Each step is a
first-class concept in the product, not a hidden implementation detail,
and each step is labelled in the user interface with the same step
number used in the agency\'s own training material so that learners can
map what they see on screen onto what they learn in class.

**8.1 Step-by-step mapping**

  ---------- ------------------------------------------------------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Step**   **Action**                                                                      **System behaviour**
  1a         Walk through the workplace with a checklist, focusing on the largest hazards.   The field capture view streams the checklist criterion by criterion with offline support and voice notes.
  1b         Transfer every criterion marked \"not in order\" onto the action register.      The register is generated automatically from all non-compliant findings. The user never transcribes.
  2          Describe the possible health effects of each hazard.                            The risk panel exposes a dedicated health-effects field alongside likelihood and consequence.
  3          Classify the risk using likelihood and consequence.                             The risk panel computes the level from the effective risk matrix and shows it as a coloured badge.
  4          Define corrective actions.                                                      Structured action fields including current controls, proposed action, and estimated cost.
  5          Assign responsible owner and target date.                                       Owner, planned completion date, and confirmed completion date are persisted with the action.
  6          Produce a written summary prioritised by severity.                              The summary editor surfaces all risk entries ordered by level and lets the user compose the final single-page synthesis. Exported to the six-step summary template.
  ---------- ------------------------------------------------------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

**8.2 Hierarchy of controls**

The agency\'s guidance mandates a specific ordering for preventive
measures. The platform enforces this ordering at the point of action
creation by presenting the options in exactly the priority order the
guidance requires: elimination of the hazard at source, substitution of
the hazardous agent or method, engineering controls such as guards and
extraction, administrative controls such as rotation and procedure, and
personal protective equipment as the last line. The user is not
prevented from choosing a lower option, but the interface makes the
preferred order visible and stores the selected level of control for
later analytics.

**9. Key Flows**

**9.1 Preparing and completing an assessment**

The user creates a safety plan for a workplace and opens a new risk
assessment inside it. They pick one or more checklists, which may come
from the seeded catalogue or from an imported source, and the system
materialises a complete set of findings with status \"unanswered\" so
that progress can be reported deterministically from the first moment.
The user walks through the criteria in the order presented by the
checklist, marking each as compliant, non-compliant, or not applicable,
recording notes, photographs, and optional voice transcripts. For
non-compliant findings the risk panel collects likelihood and
consequence; the derived risk level is shown immediately and stored on
save. The user then opens the summary editor, fills in the six-step
header fields, composes the prioritised synthesis, and triggers the
export.

**9.2 Importing a new checklist**

The user opens the checklist library and either pastes a URL or uploads
a DOCX file. The application forwards the file to the document worker\'s
parser endpoint, receives a structured JSON document, and validates it
against the Zod schema for checklist imports. On success the checklist
is upserted by slug and version, inserting translation rows for the
Icelandic content. The user can then use the checklist immediately or
defer until translations for other languages have been supplied.

**9.3 Logging an accident and triggering review**

From any screen the user opens the accident logger and records the type,
date, severity, description, and photographs. The system offers a list
of criteria that appear related to the accident, suggested by category
match, and the user confirms which criteria must be re-assessed. A
review event is automatically created and assigned to the current safety
plan. The user can reopen the assessment to update the affected findings
and regenerate the register.

**9.4 Scheduled and event-driven review**

Each safety plan has a review cadence set at creation time and may be
extended with ad hoc review events. When a review falls due, the user is
prompted to either confirm the plan as unchanged or open a new risk
assessment cycle. The system retains full history so that successive
revisions are auditable, and the dashboard shows when the next review is
due and what triggered any past review.

**9.5 Cloning a prior assessment**

The user selects any historical risk assessment and chooses to clone it.
The system creates a new assessment in the same safety plan, copies
every finding and risk entry as a starting draft, and marks each cloned
item as \"pending review\". The new assessment is live immediately and
the user can amend it finding by finding, keeping what still applies and
updating what has changed. This is the primary reusability flow for a
safety officer who performs the same assessment on a rolling basis.

**9.6 Voice-assisted note taking**

The field view requests microphone permission on first use. When the
user taps the microphone button on a finding, the browser records audio
with MediaRecorder and streams it to the transcription endpoint, which
runs faster-whisper with the Icelandic language and a domain-specific
initial prompt biasing decoding toward occupational safety vocabulary.
The returned text is appended to the notes field for the user to edit.
The original audio blob is retained as an attachment on the finding,
providing provenance for any subsequent dispute.

**10. Reusability and Future Extensibility**

The platform is designed to serve the current course assignment, a broad
population of real-world safety officers, and any future assignment of a
similar shape, without code changes specific to any one of these users.
This section describes the design decisions that make that claim
load-bearing.

**10.1 Assignments are data**

No aspect of Verkefni IV is hard-coded in the application. The
assignment is represented by the combination of a choice of checklists,
a choice of risk matrix, and a choice of export templates. Any future
assignment that uses a different checklist, a different matrix, or a
different template is set up by adding data, not by modifying code. This
means future students at Fjölbrautaskólinn í Breiðholti, or at any other
institution, can use the same deployment by importing their own
templates and seeding their own matrices.

**10.2 Templates and checklists are versioned**

Every checklist and every document template carries a version
identifier. Risk assessments record the version of the checklist and the
identifier of the matrix they were performed against, so that reports
produced last year remain meaningful even after the underlying checklist
has been revised by the agency. The importer is idempotent with respect
to version so re-importing an unchanged checklist is a no-op.

**10.3 The safety plan outlasts any single assessment**

Because the safety plan is the top-level entity, and risk assessments
are children of it, one workplace can carry an unbroken history of
assessments across years, assessors, and regulations. The cloning flow
turns this history into a reusable template for the next assessment
cycle, which is the primary mode of operation for a safety officer at a
real workplace and is also how a student would prepare a follow-up
assignment that revisits the same workplace.

**10.4 Extension points**

The architecture exposes four explicit extension points for future
growth. New checklists are added through the importer. New document
templates are added as DOCX files with Jinja placeholders and registered
in the export package. New risk matrices are added as seed rows in the
risk\_matrix table. New languages are added by data migration into the
translation tables without any schema change. None of these extensions
require a rebuild.

**10.5 Out-of-scope integrations anticipated in the design**

The design anticipates but does not yet implement the following future
integrations. OiRA, the EU-hosted online risk assessment tool used by
the agency, has a documented data shape that the platform\'s checklist
importer could adapt to. Digital signing of exported PDFs is anticipated
for scenarios where a signed report is required for submission. An
anonymous whistleblower channel for harassment incidents can be grafted
onto the existing incident entity when the underlying privacy
requirements have been agreed. None of these extensions would require
refactoring the core model.

**11. External Integrations**

-   **Vinnueftirlitið open checklists.** The platform periodically pulls
    the public list of sectoral checklists from island.is and refreshes
    the local catalogue. The integration is read-only and relies on
    stable document URLs rather than HTML scraping wherever possible.

-   **Reglugerð.is.** Legal reference codes cited by checklists resolve
    to external URLs on the official regulation site so users can open
    the underlying text from a tooltip.

-   **LibreOffice headless.** DOCX-to-PDF conversion is delegated to a
    LibreOffice process that runs inside the document worker container.
    There is no dependence on any proprietary converter.

-   **faster-whisper.** Speech recognition uses a locally hosted Whisper
    model chosen over a cloud API to preserve the privacy of workplace
    recordings and avoid per-minute costs.

**12. Security, Privacy, and Compliance**

**12.1 Authentication is deferred but not ignored**

The present release does not introduce an identity provider. Every
entity that would eventually be scoped to an authenticated user is
nevertheless scoped to an owner identifier from the first migration. A
single helper named getCurrentUser is the only place in the codebase
where the owner is resolved. Until authentication is added it returns
the identifier of a placeholder user created by the seed. When
authentication is added it is rewritten to verify an identity token and
return the real user. No other code must change. The rules that preserve
this seam are enforced in code review: no component, query, or route
handler may hard-code the placeholder, and no repository function may
read the owner from a global.

**12.2 Transport and storage**

All client-to-server traffic is served over HTTPS. Uploaded photographs,
audio recordings, and safety data sheets are stored under per-plan
directories with filenames derived from unguessable identifiers, and the
static file handler enforces authorisation through the same
getCurrentUser helper before serving any media.

**12.3 Data protection**

User-generated content is potentially personally identifiable.
Photographs may depict workers, voice recordings may capture names and
conversations, and accident reports contain sensitive personal data. The
platform handles this content under the assumption that the Icelandic
Data Protection Act and the General Data Protection Regulation apply,
and the design expects the eventual owner of a deployed instance to
establish lawful basis for processing. A retention helper deletes
photographs and audio blobs older than a configurable window unless the
owner has pinned them explicitly.

**12.4 Risk calculation integrity**

Risk levels are derived server-side from the stored likelihood,
consequence, and effective matrix. The client never submits a computed
level and the server never trusts one if received. The effective matrix
is pinned at the time of assessment so that historic scores remain
meaningful after a matrix has been revised.

**13. Observability and Operations**

The platform emits structured JSON logs with request identifier, owner
identifier, route, latency, and outcome. Metrics cover the rate and
latency of API routes, export generation time, transcription throughput,
and database query duration. Traces propagate across service boundaries
including the Python sidecar via the W3C trace context headers. Each
component has a Dockerfile and Docker Compose brings up the full stack
for development and continuous integration. Production deployment
targets any container platform; the reference target is a single-node
deployment with Postgres, object storage for media, and the document
worker running as a separate container.

**14. Testing Strategy**

Unit tests cover the pure TypeScript packages with particular attention
to the risk matrix, the translation fallback logic, and the exported
document templates. Vitest is used as the single test runner for
TypeScript, and pytest covers the document worker. Contract tests
validate Zod schemas against recorded API fixtures to catch accidental
breakages between client and server. End-to-end tests use Playwright and
drive the application through a canonical happy path: creating a safety
plan, starting an assessment, selecting a checklist, answering a
representative sample of criteria, producing a risk entry, logging an
accident, exporting the bundle, and verifying the structural validity of
every file in the zip. A dedicated mobile-viewport Playwright suite
exercises camera and microphone permissions in a mocked environment.

**15. Delivery Plan**

Delivery is organised in three stages. Each stage produces a working,
shippable increment and scope is protected by refusing to pull features
from later stages into earlier ones.

**15.1 Stage one: assignment-complete**

Scope includes the monorepo scaffold, the shared UI and schemas, the
database and risk packages, the single web application with safety plan
and risk assessment CRUD, the checklist navigator and risk panel, the
Icelandic seed for the two checklists supplied with Verkefni IV, the 3×3
risk matrix matching the course material, and template-driven DOCX
export for the filled checklist, the register, and the six-step summary.
The exit criterion is that the student can complete Verkefni IV end to
end inside the tool and submit the generated documents.

**15.2 Stage two: field capture and the wider safety plan**

Scope includes the document worker with Whisper transcription and
LibreOffice PDF conversion, the mobile-optimised field capture view,
photograph attachment with geolocation, the web importer for the
remaining checklists, ZIP bundle export with both DOCX and PDF, the
accident and near-miss log, the chemical inventory with SDS attachments,
the emergency plan, the harassment policy and incident flow, the
training plan, the review scheduler, and the cloning flow for recurring
assessments. The exit criterion is that a safety officer at a small
enterprise can use the platform as their primary compliance tool without
external aids.

**15.3 Stage three: polish and scale**

Scope includes the Recharts dashboards, keyboard navigation,
multi-language seed content for English and Polish interface chrome,
authentication integration through the getCurrentUser seam, full
Playwright coverage, structured observability, production deployment
artefacts, and optional signed PDF export for formal submissions. The
exit criterion is that the platform is ready for multi-tenant
deployment.

**16. Risks and Mitigations**

  ---------------------------------------------------------------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Risk**                                                                                                               **Mitigation**
  Whisper accuracy on Icelandic domain vocabulary is inconsistent.                                                       Use faster-whisper with a large model, pass a domain-specific initial prompt, let the user edit the transcript before saving, and retain the raw audio for review.
  Official checklist templates change without notice.                                                                    Cache imported DOCX sources, version the parsed output, and run the parser in a sandbox that reports schema deviations before applying them to the catalogue.
  Exported DOCX fidelity is critical because instructors expect exact layouts.                                           Use the original statutory templates as skeletons rather than regenerating from scratch, and cover template rendering with Playwright-assisted visual checks against a reference PDF.
  Mobile browsers vary in how they expose geolocation and media capture.                                                 Maintain a small capability-detection layer in the field view and degrade gracefully: fall back to manual address entry and file upload when native capture is unavailable.
  The broader safety-plan scope dilutes focus and delays the assignment-ready release.                                   Enforce the stage boundary in review: anything outside the Stage One list is triaged into Stage Two or later before merging, irrespective of how small the change appears.
  Translation coverage lags behind the Icelandic source for English and Polish.                                          Make missing translations a visible UI state with an explicit fallback indicator, and surface an administrative report of untranslated strings so translators can be targeted efficiently.
  Deferring authentication creates latent authorisation bugs that are only revealed when identity is later introduced.   Write the getCurrentUser helper on day one, use it from every authorisation site, and add a linter rule that fails any new code that hard-codes the placeholder identifier.
  The risk matrix changes after historical assessments have been recorded.                                               Pin the effective matrix identifier to every assessment so historic scores remain meaningful after revisions.
  ---------------------------------------------------------------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**17. Open Questions**

-   Which identity provider will authentication be built on when it is
    introduced, and does the choice affect the contract exposed by
    getCurrentUser?

-   What is the retention policy for audio recordings once a transcript
    has been saved, and how is this communicated to users at the moment
    of recording?

-   Which Postgres target is preferred for hosted deployment, and does
    that choice influence the decision to retain better-sqlite3 as the
    local default?

-   Is there a requirement to sign exported PDFs digitally for
    submission to external parties, and if so which signing provider
    should be integrated?

-   Will the English and Polish translation effort extend to
    user-generated content via machine translation on export, or will it
    remain limited to interface chrome and checklist source content?

-   Will the platform ever need to interoperate with OiRA either as a
    data source or as an export target, and if so what is the canonical
    mapping between OiRA modules and the platform\'s checklist entities?

-   Does the user intend to host the platform as a single-user local tool, a
    multi-tenant shared service, or both, and how does that intention
    affect the operational plan for Stage Three?

**18. Glossary**

The following Icelandic terms appear verbatim in the product because
they are domain of art. They are defined here for contributors who do
not speak Icelandic.

  ----------------------------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Term**                                  **Meaning**
  Skrifleg áætlun um öryggi og heilbrigði   Written safety and health plan. The statutory umbrella document required of every workplace, containing the risk assessment, the action plan, the emergency plan, the harassment policy, the accident log, and related artefacts.
  Áhættumat                                 Risk assessment. The structured process of identifying, evaluating, and recording workplace hazards and the controls applied to them.
  Áhættugreining                            Hazard identification. The first phase of risk assessment.
  Vinnuumhverfisvísir                       Work environment indicator. A sector-specific checklist published by Vinnueftirlitið.
  Vinnueftirlitið                           The Administration of Occupational Safety and Health; the regulatory body that issues and maintains the checklists and supporting guidance.
  Áhættukubbur                              Risk cube. The two-dimensional likelihood-by-consequence matrix used to classify risk.
  Skráning og aðgerðaáætlun                 Register and action plan. The statutory form that records each hazard, its risk level, and its corrective actions.
  Samantekt                                 Summary. The single-page six-step synthesis of the assessment used as the submission document.
  Áætlun um heilsuvernd og forvarnir        Health protection and prevention plan. The time-bounded action plan that derives from the risk assessment.
  Neyðaráætlun                              Emergency plan. Procedures for first aid, firefighting, and evacuation.
  Eftirfylgni                               Follow-up. Structured review of corrective actions and the plan itself.
  Slysaskrá                                 Accident log. Mandatory register of workplace accidents and near-misses.
  Efnalisti                                 Chemical inventory. Register of hazardous substances on site with safety data sheets.
  Öryggistrúnaðarmaður                      Safety representative elected by workers.
  Öryggisvörður                             Safety officer appointed by the employer.
  OiRA                                      Online interactive Risk Assessment; the EU-level risk-assessment tool hosted by EU-OSHA that Vinnueftirlitið cooperates with.
  ----------------------------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**19. Appendix: Source Material Reviewed**

The following documents were reviewed in preparation of this design. All
are supplied as part of Verkefni IV and are considered authoritative for
the purposes of the traceability matrix in section 4.

-   FRVV Verkefni IV --- the assignment brief defining the three
    workplace options, the required deliverables, the submission
    process, and the categories of hazard to be assessed.

-   Skráning og aðgerðaáætlun --- the statutory register template with
    header fields for hazard, possible health effects, affected persons,
    risk classification, current controls, proposed actions, estimated
    cost, planned completion, owner, and confirmed completion.

-   Samantekt --- 6. skref aðgerðaráætlunar vegna áhættumats --- the
    six-step summary template with header fields for company, location,
    date, people, method, and prioritised synthesis.

-   Vinnuumhverfisvísir fyrir Trésmíðaverkstæði --- the woodworking
    workshop checklist, used as the seed template for the Smiðja option.

-   Vinnuumhverfisvísir fyrir byggingarsvæði --- the construction site
    checklist, used as the seed template for the Austurberg option.

-   Áhættugreining --- áhættumat 4-6-skref leiðbeinandi lesefni --- the
    course pedagogical material on the six-step method, including the
    3×3 risk matrix used in the course.

-   Leiðbeiningar um áhættumat --- the formal guidance document from
    Vinnueftirlitið (second edition, 2021) covering the written safety
    plan, the preparation of the assessment, the selection of a risk
    matrix, the hierarchy of controls, and the follow-up and review
    process.

-   Reglur nr. 547/1996 um hollustu og öryggi á byggingarvinnustöðum og
    aðra tímabundna mannvirkjagerð --- the regulation governing
    construction sites and time-limited construction work.
