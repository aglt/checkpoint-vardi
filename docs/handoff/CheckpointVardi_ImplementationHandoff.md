**Checkpoint Varði**

Workplace Safety Management Platform

*Implementation Handoff --- System Architect & Development Team*

Version 1.0 · 11 April 2026

**1. Document Purpose**

This handoff package is the single entry point for the system architect
and the delivery team implementing Checkpoint Varði (codename: Vardi).
It captures the full scope derived from the Verkefni IV source material
at Fjölbrautaskólinn í Breiðholti and from the Icelandic workplace
safety regulations, then translates that scope into an implementable
architecture, a seeded data model, an API surface, a delivery plan, and
a set of user stories organised for parallel execution by specialised
agent teams.

The companion design document (docs/handoff/CheckpointVardi\_SystemDesign.md)
contains the architectural rationale and product framing. This document
is execution-oriented: schemas, diagrams, endpoints, stories, acceptance
criteria.

**1.1 Audience**

-   System architect --- reviews and approves the design before sprint
    zero.

-   Tech leads of each agent team --- use Section 12 to claim epics and
    seed their backlog.

-   Individual contributor agents --- read the data model, API surface,
    and user stories relevant to their team.

-   QA / linguistic reviewers --- use Sections 9, 10, 13 for test
    planning.

**1.2 Companion artefacts**

-   packages/checklists/assets/seeds/ --- seed JSON extracted from the vísar and regulatory
    catalogue.

-   docs/diagrams/ --- Mermaid source for every diagram in this
    document (editable).

-   docs/handoff/CheckpointVardi\_SystemDesign.md --- product, regulatory, and
    architectural narrative.

**2. Executive Summary**

Checkpoint Varði (codename: Vardi) is a reusable web platform for
creating, running, and exporting Icelandic workplace risk assessments
and the full written safety plan (skrifleg áætlun um öryggi og
heilbrigði) required by Lög nr. 46/1980 and Reglugerð 920/2006. It
ingests the Vinnueftirlit vísar as seed checklists, walks the user
through the six-step risk assessment method (1a walk-through, 1b
transfer non-compliant items, 2 health effects, 3 likelihood ×
consequence classification, 4 controls, 5 owner and due date, 6
prioritised summary), and emits teacher-/inspector-ready documents using
docxtemplater.

The first concrete use case is Verkefni IV: a student assessing either
FB Smiðja (woodworking workshop), the Austurberg construction site, or
their own workplace. The same platform must serve future assignments,
real safety officers, and foreign-language workers (Icelandic primary,
English and Polish planned) without schema changes --- hence the
translation-table pattern and the pluggable checklist/matrix catalogue.

**2.1 Scope at a glance**

  --------------------- ----------------------------------------------------------------------------- --------------------------------
  **Area**              **In scope for v1**                                                           **Deferred**
  Checklists            Wood workshop + construction vísar seeded; upload/URL import for more         Full CRUD editor for templates
  Risk assessment       6-step method, 2×2/3×3/5×5 matrices, voice notes, photos                      Multi-user concurrent editing
  Written safety plan   Emergency plan, policies, accident log, chemicals, training, review cadence   Advanced SDS parsing
  Exports               Checklist, register, summary, PDF via LibreOffice                             Custom template editor
  Auth                  Single user placeholder with clean getCurrentUser() seam                      Real SSO / Firebase auth
  i18n                  Icelandic content + English UI labels; translation tables ready               Polish content translations
  --------------------- ----------------------------------------------------------------------------- --------------------------------

**3. Regulatory and Source Material Context**

The platform must embody the following Icelandic rules. Every regulation
listed is seeded in packages/checklists/assets/seeds/legal\_references.json and referenced
by criteria rows via criterion.legalRefs (JSON) and legalReference.code
(PK).

  -------------- ------------------------------------------------------- --------------------------------------------
  **Code**       **Short title**                                         **Relevance**
  L-46/1980      Lög um aðbúnað, hollustuhætti og öryggi á vinnustöðum   Umbrella law; mandates written safety plan
  Rg-920/2006    Skipulag og framkvæmd vinnuverndarstarfs                Composition of the written safety plan
  Rg-921/2006    Varnir gegn hávaða                                      Noise assessments, criteria references
  Rg-922/2006    Varnir gegn vélrænum titringi                           Vibration assessments
  Rg-553/2004    Verndun gegn efnum                                      Chemical exposure, SDS handling
  R-547/1996     Hollusta á byggingarvinnustöðum                         Construction archetype
  Rg-1009/2015   Einelti, áreitni, ofbeldi                               Harassment policy + incident log
  R-581/1995     Húsnæði vinnustaða                                      Physical workplace requirements
  Rg-426/1999    Vinna barna og unglinga                                 Training + induction material
  Rg-931/2000    Þungaðar konur / með barn á brjósti                     Special risk categories
  -------------- ------------------------------------------------------- --------------------------------------------

**3.1 Source documents ingested**

-   Verkefni IV brief --- defines the three workplace options and the
    submission deliverables.

-   Skráning og aðgerðaáætlun form --- maps to the riskEntry table
    columns.

-   Samantekt 6 skref --- maps to the summary entity (company, where,
    when, who, how).

-   Vinnuumhverfisvísir fyrir Trésmíðaverkstæði --- 15 sections, 66
    criteria.

-   Vinnuumhverfisvísir fyrir byggingarsvæði --- 14 sections, 69
    criteria.

-   Áhættugreining 4--6 skref leiðbeinandi lesefni --- 3×3 matrix +
    methodology numbering.

-   Áhættumat-leiðbeiningar (Vinnueftirlit) --- 5×5 example matrix,
    hierarchy of controls, written safety plan composition.

-   Reglur 547/1996 --- construction site archetype requirements.

**4. Personas**

  --------------------- --------------------------------------- ----------------------------------------------------
  **Persona**           **Primary goal**                        **Capability notes**
  Student               Complete Verkefni IV deliverables       First-time user, needs guided flow, Icelandic UI
  Safety officer        Maintain written safety plan annually   Multi-workplace, review cadence, accident handling
  Site foreman          Field capture during walk-through       Mobile, voice + photo, offline tolerance
  Inspector / teacher   Review exported bundle                  Read-only, PDF friendly, deterministic layout
  --------------------- --------------------------------------- ----------------------------------------------------

**5. System Context**

External actors, the Checkpoint Varði platform, and neighbouring
systems.

**Figure 5.1 --- System context diagram**

Source: docs/diagrams/01-system-context.mmd

+----------------------------------------------------------------------+
| %% System Context --- Vindhlíf                                       |
|                                                                      |
| %% Shows external actors and neighbouring systems that interact with |
| the platform.                                                        |
|                                                                      |
| flowchart LR                                                         |
|                                                                      |
| student(\[Student\])                                                 |
|                                                                      |
| officer(\[Safety Officer\])                                          |
|                                                                      |
| foreman(\[Site Foreman\])                                            |
|                                                                      |
| inspector(\[Inspector / Teacher\])                                   |
|                                                                      |
| subgraph platform\[\"Vindhlíf Platform\"\]                           |
|                                                                      |
| web\[\"Web Application\<br/\>(apps/web)\"\]                          |
|                                                                      |
| worker\[\"Document Worker\<br/\>(services/doc-worker)\"\]            |
|                                                                      |
| db\[(\"Database\<br/\>SQLite / Postgres\")\]                         |
|                                                                      |
| files\[(\"Media Storage\<br/\>photos · audio · SDS\")\]              |
|                                                                      |
| end                                                                  |
|                                                                      |
| ver\[/\"Vinnueftirlitið\<br/\>island.is checklists\"/\]              |
|                                                                      |
| reg\[/\"reglugerd.is\<br/\>legal references\"/\]                     |
|                                                                      |
| oira\[/\"OiRA\<br/\>(future)\"/\]                                    |
|                                                                      |
| student \--\>\|\"browse · assess · export\"\| web                    |
|                                                                      |
| officer \--\>\|\"maintain safety plan\"\| web                        |
|                                                                      |
| foreman \--\>\|\"field capture\"\| web                               |
|                                                                      |
| inspector \--\>\|\"reads exports\"\| web                             |
|                                                                      |
| web \--\> db                                                         |
|                                                                      |
| web \--\> files                                                      |
|                                                                      |
| web \--\>\|\"parse · transcribe · pdf\"\| worker                     |
|                                                                      |
| worker \--\> files                                                   |
|                                                                      |
| web -.-\>\|\"import checklists\"\| ver                               |
|                                                                      |
| web -.-\>\|\"resolve legal refs\"\| reg                              |
|                                                                      |
| web -.-\>\|\"future integration\"\| oira                             |
+----------------------------------------------------------------------+

**6. Container Architecture**

Single Next.js 15 application (apps/web) hosting both UI and API route
handlers, a Python FastAPI sidecar (services/doc-worker) for Whisper
transcription and LibreOffice PDF conversion, shared packages for UI,
schemas, db access, risk engine, export templates, and checklist
parsing.

**Figure 6.1 --- Container / component diagram**

Source: docs/diagrams/02-container-architecture.mmd

+----------------------------------------------------------------------+
| %% Container / Component Architecture                                |
|                                                                      |
| flowchart TB                                                         |
|                                                                      |
| subgraph monorepo\[\"pnpm monorepo · TypeScript · Node 22\"\]        |
|                                                                      |
| direction TB                                                         |
|                                                                      |
| subgraph app\[\"apps/web (Next.js 15, React 19)\"\]                  |
|                                                                      |
| pages\[\"App router\<br/\>· /projects\<br/\>· /plans/:id\<br/\>·     |
| /plans/:id/assessments/:id\<br/\>· /capture/:finding\<br/\>·         |
| /library · /imports · /settings\"\]                                  |
|                                                                      |
| api\[\"Route handlers\<br/\>· /api/projects\<br/\>·                  |
| /api/assessments\<br/\>· /api/findings\<br/\>· /api/risks\<br/\>·    |
| /api/accidents\<br/\>· /api/chemicals\<br/\>· /api/templates\<br/\>· |
| /api/exports\<br/\>· /api/transcribe\<br/\>· /api/photos\"\]         |
|                                                                      |
| end                                                                  |
|                                                                      |
| subgraph packages\[\"Shared packages\"\]                             |
|                                                                      |
| ui\[\"packages/ui\<br/\>shadcn · Radix · CVA\"\]                     |
|                                                                      |
| schemas\[\"packages/schemas\<br/\>Zod contracts\"\]                  |
|                                                                      |
| dbpkg\[\"packages/db\<br/\>Drizzle ORM\"\]                           |
|                                                                      |
| risk\[\"packages/risk\<br/\>matrix lookup\"\]                        |
|                                                                      |
| export\[\"packages/export\<br/\>docxtemplater\"\]                    |
|                                                                      |
| checklists\[\"packages/checklists\<br/\>parser bridge · importer\"\] |
|                                                                      |
| end                                                                  |
|                                                                      |
| end                                                                  |
|                                                                      |
| subgraph sidecar\[\"services/doc-worker (Python 3.12)\"\]            |
|                                                                      |
| fastapi\[\"FastAPI app\"\]                                           |
|                                                                      |
| whisper\[\"faster-whisper\"\]                                        |
|                                                                      |
| libreoffice\[\"LibreOffice headless\"\]                              |
|                                                                      |
| parser\[\"python-docx parser\"\]                                     |
|                                                                      |
| end                                                                  |
|                                                                      |
| db\[(\"better-sqlite3 · Postgres\")\]                                |
|                                                                      |
| media\[(\"Media storage\")\]                                         |
|                                                                      |
| pages \--\> ui                                                       |
|                                                                      |
| pages \--\> schemas                                                  |
|                                                                      |
| api \--\> schemas                                                    |
|                                                                      |
| api \--\> dbpkg                                                      |
|                                                                      |
| api \--\> risk                                                       |
|                                                                      |
| api \--\> export                                                     |
|                                                                      |
| api \--\> checklists                                                 |
|                                                                      |
| dbpkg \--\> db                                                       |
|                                                                      |
| api \--\> media                                                      |
|                                                                      |
| api \--\>\|\"HTTP\"\| fastapi                                        |
|                                                                      |
| fastapi \--\> whisper                                                |
|                                                                      |
| fastapi \--\> libreoffice                                            |
|                                                                      |
| fastapi \--\> parser                                                 |
+----------------------------------------------------------------------+

**6.1 Monorepo layout**

+-----------------------------------------------------------------------+
| vardi/                                                                |
|                                                                       |
| ├─ apps/                                                              |
|                                                                       |
| │ └─ web/ \# Next.js 15 (App Router), UI + /api routes                |
|                                                                       |
| ├─ services/                                                          |
|                                                                       |
| │ └─ doc-worker/ \# FastAPI, faster-whisper, LibreOffice, python-docx |
|                                                                       |
| ├─ packages/                                                          |
|                                                                       |
| │ ├─ ui/ \# shadcn + Radix components, CVA, tailwind-merge            |
|                                                                       |
| │ ├─ schemas/ \# Zod contracts shared between UI and API              |
|                                                                       |
| │ ├─ db/ \# Drizzle schema, migrations, typed client                  |
|                                                                       |
| │ ├─ risk/ \# Matrix lookup + classify(matrixId, L, C)                |
|                                                                       |
| │ ├─ export/ \# docxtemplater template loaders                        |
|                                                                       |
| │ └─ checklists/ \# Seed loader + import normaliser                   |
|                                                                       |
| ├─ handoff/                                                           |
|                                                                       |
| │ ├─ seeds/ \# JSON seed data (this handoff)                          |
|                                                                       |
| │ └─ diagrams/ \# Mermaid sources                                     |
|                                                                       |
| ├─ docker-compose.yml                                                 |
|                                                                       |
| └─ pnpm-workspace.yaml                                                |
+-----------------------------------------------------------------------+

**6.2 Tech stack decisions**

  ------------- --------------------------------------------- ---------------------------------------------------------------------
  **Concern**   **Choice**                                    **Rationale**
  Language      TypeScript (Node 22) + Python 3.12 sidecar    Matches existing monorepo; Python only where needed (STT, soffice)
  Framework     Next.js 15 App Router, React 19               Single deployable for UI+API; RSC where it simplifies data fetching
  Styling       Tailwind 4 + shadcn + Radix + CVA             Matches house style; accessible primitives
  State/data    TanStack Query + Zod                          Type-safe server contracts end-to-end
  DB            Drizzle ORM, SQLite (dev) / Postgres (prod)   Same schema both; better-sqlite3 for offline-first student builds
  Voice         faster-whisper (Icelandic)                    Best open Icelandic accuracy
  PDF           LibreOffice headless                          Fidelity parity with teacher templates
  Testing       Vitest + Playwright                           House standard
  Ops           Docker Compose, Caddy TLS                     Minimal ops surface
  ------------- --------------------------------------------- ---------------------------------------------------------------------

**7. Data Model**

Structural columns are English. Human-readable strings (titles,
guidance, labels) live exclusively in sibling \*\_translation tables
keyed by (entityId, language) with ISO 639-1 language codes. The \'is\'
locale is the required baseline; \'en\' and \'pl\' can be added without
schema migrations.

**Figure 7.1 --- Entity relationship diagram**

Source: docs/diagrams/03-data-model-erd.mmd

+----------------------------------------------------------------------+
| %% Data model --- entity relationship diagram                        |
|                                                                      |
| %% English structural columns, translations in sibling               |
| \*\_translation tables.                                              |
|                                                                      |
| erDiagram                                                            |
|                                                                      |
| user \|\|\--o{ workplace : owns                                      |
|                                                                      |
| workplace \|\|\--\|\| safetyPlan : has                               |
|                                                                      |
| safetyPlan \|\|\--o{ riskAssessment : contains                       |
|                                                                      |
| safetyPlan \|\|\--o{ accident : logs                                 |
|                                                                      |
| safetyPlan \|\|\--o{ chemical : inventories                          |
|                                                                      |
| safetyPlan \|\|\--o\| emergencyPlan : has                            |
|                                                                      |
| safetyPlan \|\|\--o{ policy : owns                                   |
|                                                                      |
| safetyPlan \|\|\--o{ incident : handles                              |
|                                                                      |
| safetyPlan \|\|\--o\| trainingPlan : has                             |
|                                                                      |
| safetyPlan \|\|\--o{ reviewEvent : scheduled                         |
|                                                                      |
| riskAssessment }o\--o{ checklistTemplate : uses                      |
|                                                                      |
| riskAssessment }o\--\|\| riskMatrix : evaluatedWith                  |
|                                                                      |
| riskAssessment \|\|\--o{ finding : contains                          |
|                                                                      |
| finding \|\|\--o{ photo : has                                        |
|                                                                      |
| finding \|\|\--o\| riskEntry : escalatesTo                           |
|                                                                      |
| riskAssessment \|\|\--o\| summary : concludedBy                      |
|                                                                      |
| checklistTemplate \|\|\--o{ section : organizes                      |
|                                                                      |
| section \|\|\--o{ criterion : has                                    |
|                                                                      |
| criterion }o\--o{ legalReference : cites                             |
|                                                                      |
| checklistTemplate \|\|\--o{ checklistTemplateTranslation : tr        |
|                                                                      |
| section \|\|\--o{ sectionTranslation : tr                            |
|                                                                      |
| criterion \|\|\--o{ criterionTranslation : tr                        |
|                                                                      |
| legalReference \|\|\--o{ legalReferenceTranslation : tr              |
|                                                                      |
| riskMatrix \|\|\--o{ riskMatrixTranslation : tr                      |
|                                                                      |
| chemical \|\|\--o{ sdsAttachment : has                               |
|                                                                      |
| accident }o\--o{ criterion : triggersReviewOf                        |
|                                                                      |
| user {                                                               |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text displayName                                                     |
|                                                                      |
| text locale                                                          |
|                                                                      |
| }                                                                    |
|                                                                      |
| workplace {                                                          |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text ownerId FK                                                      |
|                                                                      |
| text name                                                            |
|                                                                      |
| text address                                                         |
|                                                                      |
| text archetype \"fixed\|mobile\|construction\"                       |
|                                                                      |
| text primaryLanguage                                                 |
|                                                                      |
| }                                                                    |
|                                                                      |
| safetyPlan {                                                         |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text workplaceId FK                                                  |
|                                                                      |
| text status                                                          |
|                                                                      |
| date createdAt                                                       |
|                                                                      |
| date reviewDueAt                                                     |
|                                                                      |
| text reviewCadence                                                   |
|                                                                      |
| }                                                                    |
|                                                                      |
| riskAssessment {                                                     |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text safetyPlanId FK                                                 |
|                                                                      |
| text riskMatrixId FK                                                 |
|                                                                      |
| date startedAt                                                       |
|                                                                      |
| date completedAt                                                     |
|                                                                      |
| text status                                                          |
|                                                                      |
| }                                                                    |
|                                                                      |
| checklistTemplate {                                                  |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text slug UK                                                         |
|                                                                      |
| text sourceUrl                                                       |
|                                                                      |
| text version                                                         |
|                                                                      |
| date importedAt                                                      |
|                                                                      |
| }                                                                    |
|                                                                      |
| section {                                                            |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text templateId FK                                                   |
|                                                                      |
| int order                                                            |
|                                                                      |
| }                                                                    |
|                                                                      |
| criterion {                                                          |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text sectionId FK                                                    |
|                                                                      |
| int order                                                            |
|                                                                      |
| text number                                                          |
|                                                                      |
| text category                                                        |
|                                                                      |
| json legalRefs                                                       |
|                                                                      |
| }                                                                    |
|                                                                      |
| finding {                                                            |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text assessmentId FK                                                 |
|                                                                      |
| text criterionId FK                                                  |
|                                                                      |
| text status \"ok\|notOk\|notApplicable\|unanswered\"                 |
|                                                                      |
| text notes                                                           |
|                                                                      |
| text voiceTranscript                                                 |
|                                                                      |
| text notesLanguage                                                   |
|                                                                      |
| date createdAt                                                       |
|                                                                      |
| }                                                                    |
|                                                                      |
| riskEntry {                                                          |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text findingId FK                                                    |
|                                                                      |
| text hazard                                                          |
|                                                                      |
| text healthEffects                                                   |
|                                                                      |
| text whoAtRisk                                                       |
|                                                                      |
| int likelihood                                                       |
|                                                                      |
| int consequence                                                      |
|                                                                      |
| text riskLevel \"low\|medium\|high\"                                 |
|                                                                      |
| text currentControls                                                 |
|                                                                      |
| text proposedAction                                                  |
|                                                                      |
| text controlHierarchy                                                |
| \"eliminate\|substitute\|engineering\|administrative\|ppe\"          |
|                                                                      |
| int costEstimate                                                     |
|                                                                      |
| text owner                                                           |
|                                                                      |
| date dueDate                                                         |
|                                                                      |
| date completedAt                                                     |
|                                                                      |
| }                                                                    |
|                                                                      |
| photo {                                                              |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text findingId FK                                                    |
|                                                                      |
| text path                                                            |
|                                                                      |
| real lat                                                             |
|                                                                      |
| real lon                                                             |
|                                                                      |
| date takenAt                                                         |
|                                                                      |
| text caption                                                         |
|                                                                      |
| }                                                                    |
|                                                                      |
| summary {                                                            |
|                                                                      |
| text assessmentId PK                                                 |
|                                                                      |
| text companyName                                                     |
|                                                                      |
| text location                                                        |
|                                                                      |
| date date                                                            |
|                                                                      |
| text people                                                          |
|                                                                      |
| text method                                                          |
|                                                                      |
| text notes                                                           |
|                                                                      |
| }                                                                    |
|                                                                      |
| riskMatrix {                                                         |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text slug UK                                                         |
|                                                                      |
| int likelihoodLevels                                                 |
|                                                                      |
| int consequenceLevels                                                |
|                                                                      |
| json lookup                                                          |
|                                                                      |
| }                                                                    |
|                                                                      |
| accident {                                                           |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text safetyPlanId FK                                                 |
|                                                                      |
| text type \"accident\|nearMiss\"                                     |
|                                                                      |
| date occurredAt                                                      |
|                                                                      |
| text severity                                                        |
|                                                                      |
| text description                                                     |
|                                                                      |
| text reporterName                                                    |
|                                                                      |
| }                                                                    |
|                                                                      |
| chemical {                                                           |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text safetyPlanId FK                                                 |
|                                                                      |
| text commonName                                                      |
|                                                                      |
| text casNumber                                                       |
|                                                                      |
| text hazardStatements                                                |
|                                                                      |
| text storageLocation                                                 |
|                                                                      |
| real quantity                                                        |
|                                                                      |
| text unit                                                            |
|                                                                      |
| }                                                                    |
|                                                                      |
| sdsAttachment {                                                      |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text chemicalId FK                                                   |
|                                                                      |
| text language                                                        |
|                                                                      |
| text version                                                         |
|                                                                      |
| text path                                                            |
|                                                                      |
| }                                                                    |
|                                                                      |
| emergencyPlan {                                                      |
|                                                                      |
| text safetyPlanId PK                                                 |
|                                                                      |
| text evacuationRoutes                                                |
|                                                                      |
| text firstAidResources                                               |
|                                                                      |
| text fireSuppression                                                 |
|                                                                      |
| date updatedAt                                                       |
|                                                                      |
| }                                                                    |
|                                                                      |
| policy {                                                             |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text safetyPlanId FK                                                 |
|                                                                      |
| text kind \"harassment\|safety\|other\"                              |
|                                                                      |
| text title                                                           |
|                                                                      |
| text body                                                            |
|                                                                      |
| text version                                                         |
|                                                                      |
| date effectiveDate                                                   |
|                                                                      |
| }                                                                    |
|                                                                      |
| incident {                                                           |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text safetyPlanId FK                                                 |
|                                                                      |
| text kind                                                            |
|                                                                      |
| date reportedAt                                                      |
|                                                                      |
| text status                                                          |
|                                                                      |
| text summary                                                         |
|                                                                      |
| }                                                                    |
|                                                                      |
| trainingPlan {                                                       |
|                                                                      |
| text safetyPlanId PK                                                 |
|                                                                      |
| text induction                                                       |
|                                                                      |
| text ongoing                                                         |
|                                                                      |
| text languageCoverage                                                |
|                                                                      |
| }                                                                    |
|                                                                      |
| reviewEvent {                                                        |
|                                                                      |
| text id PK                                                           |
|                                                                      |
| text safetyPlanId FK                                                 |
|                                                                      |
| text trigger \"scheduled\|accident\|change\|regulation\"             |
|                                                                      |
| date dueAt                                                           |
|                                                                      |
| date completedAt                                                     |
|                                                                      |
| text outcome                                                         |
|                                                                      |
| }                                                                    |
|                                                                      |
| legalReference {                                                     |
|                                                                      |
| text code PK                                                         |
|                                                                      |
| text url                                                             |
|                                                                      |
| }                                                                    |
+----------------------------------------------------------------------+

**7.1 Drizzle schema --- core tables**

+----------------------------------------------------------------------+
| // packages/db/src/schema.ts (excerpt --- see repo for full set)     |
|                                                                      |
| import { sqliteTable, text, integer, real, primaryKey } from         |
| \"drizzle-orm/sqlite-core\";                                         |
|                                                                      |
| export const user = sqliteTable(\"user\", {                          |
|                                                                      |
| id: text(\"id\").primaryKey(),                                       |
|                                                                      |
| displayName: text(\"display\_name\").notNull(),                      |
|                                                                      |
| locale: text(\"locale\").notNull().default(\"is\"),                  |
|                                                                      |
| });                                                                  |
|                                                                      |
| export const workplace = sqliteTable(\"workplace\", {                |
|                                                                      |
| id: text(\"id\").primaryKey(),                                       |
|                                                                      |
| ownerId: text(\"owner\_id\").notNull().references(() =\> user.id),   |
|                                                                      |
| name: text(\"name\").notNull(),                                      |
|                                                                      |
| address: text(\"address\"),                                          |
|                                                                      |
| archetype: text(\"archetype\", { enum: \[\"fixed\", \"mobile\",      |
| \"construction\"\] }).notNull(),                                     |
|                                                                      |
| primaryLanguage:                                                     |
| text(\"primary\_language\").notNull().default(\"is\"),               |
|                                                                      |
| });                                                                  |
|                                                                      |
| export const safetyPlan = sqliteTable(\"safety\_plan\", {            |
|                                                                      |
| id: text(\"id\").primaryKey(),                                       |
|                                                                      |
| workplaceId: text(\"workplace\_id\").notNull().references(() =\>     |
| workplace.id),                                                       |
|                                                                      |
| status: text(\"status\").notNull().default(\"active\"),              |
|                                                                      |
| createdAt: integer(\"created\_at\", { mode: \"timestamp\"            |
| }).notNull(),                                                        |
|                                                                      |
| reviewDueAt: integer(\"review\_due\_at\", { mode: \"timestamp\" }),  |
|                                                                      |
| reviewCadence:                                                       |
| text(\"review\_cadence\").notNull().default(\"yearly\"),             |
|                                                                      |
| });                                                                  |
|                                                                      |
| export const riskAssessment = sqliteTable(\"risk\_assessment\", {    |
|                                                                      |
| id: text(\"id\").primaryKey(),                                       |
|                                                                      |
| safetyPlanId: text(\"safety\_plan\_id\").notNull().references(() =\> |
| safetyPlan.id),                                                      |
|                                                                      |
| riskMatrixId: text(\"risk\_matrix\_id\").notNull().references(() =\> |
| riskMatrix.id),                                                      |
|                                                                      |
| startedAt: integer(\"started\_at\", { mode: \"timestamp\"            |
| }).notNull(),                                                        |
|                                                                      |
| completedAt: integer(\"completed\_at\", { mode: \"timestamp\" }),    |
|                                                                      |
| status: text(\"status\").notNull().default(\"draft\"),               |
|                                                                      |
| });                                                                  |
|                                                                      |
| export const checklistTemplate =                                     |
| sqliteTable(\"checklist\_template\", {                               |
|                                                                      |
| id: text(\"id\").primaryKey(),                                       |
|                                                                      |
| slug: text(\"slug\").notNull().unique(),                             |
|                                                                      |
| sourceUrl: text(\"source\_url\"),                                    |
|                                                                      |
| version: text(\"version\").notNull(),                                |
|                                                                      |
| importedAt: integer(\"imported\_at\", { mode: \"timestamp\"          |
| }).notNull(),                                                        |
|                                                                      |
| });                                                                  |
+----------------------------------------------------------------------+

**7.1.1 Translation sibling tables**

+----------------------------------------------------------------------+
| export const checklistTemplateTranslation = sqliteTable(             |
|                                                                      |
| \"checklist\_template\_translation\",                                |
|                                                                      |
| {                                                                    |
|                                                                      |
| templateId: text(\"template\_id\").notNull().references(() =\>       |
| checklistTemplate.id),                                               |
|                                                                      |
| language: text(\"language\").notNull(), // \'is\' \| \'en\' \|       |
| \'pl\'                                                               |
|                                                                      |
| title: text(\"title\").notNull(),                                    |
|                                                                      |
| description: text(\"description\"),                                  |
|                                                                      |
| },                                                                   |
|                                                                      |
| \(t\) =\> ({ pk: primaryKey({ columns: \[t.templateId, t.language\]  |
| }) })                                                                |
|                                                                      |
| );                                                                   |
|                                                                      |
| // section\_translation, criterion\_translation,                     |
| legal\_reference\_translation,                                       |
|                                                                      |
| // risk\_matrix\_translation follow the same (entityId, language)    |
| composite PK pattern.                                                |
+----------------------------------------------------------------------+

**7.1.2 Assessment execution tables**

+----------------------------------------------------------------------+
| export const finding = sqliteTable(\"finding\", {                    |
|                                                                      |
| id: text(\"id\").primaryKey(),                                       |
|                                                                      |
| assessmentId: text(\"assessment\_id\").notNull().references(() =\>   |
| riskAssessment.id),                                                  |
|                                                                      |
| criterionId: text(\"criterion\_id\").notNull().references(() =\>     |
| criterion.id),                                                       |
|                                                                      |
| status: text(\"status\", {                                           |
|                                                                      |
| enum: \[\"ok\", \"notOk\", \"notApplicable\", \"unanswered\"\],      |
|                                                                      |
| }).notNull().default(\"unanswered\"),                                |
|                                                                      |
| notes: text(\"notes\"),                                              |
|                                                                      |
| voiceTranscript: text(\"voice\_transcript\"),                        |
|                                                                      |
| notesLanguage: text(\"notes\_language\"),                            |
|                                                                      |
| createdAt: integer(\"created\_at\", { mode: \"timestamp\"            |
| }).notNull(),                                                        |
|                                                                      |
| });                                                                  |
|                                                                      |
| export const riskEntry = sqliteTable(\"risk\_entry\", {              |
|                                                                      |
| id: text(\"id\").primaryKey(),                                       |
|                                                                      |
| findingId: text(\"finding\_id\").notNull().references(() =\>         |
| finding.id),                                                         |
|                                                                      |
| hazard: text(\"hazard\").notNull(),                                  |
|                                                                      |
| healthEffects: text(\"health\_effects\"),                            |
|                                                                      |
| whoAtRisk: text(\"who\_at\_risk\"),                                  |
|                                                                      |
| likelihood: integer(\"likelihood\").notNull(),                       |
|                                                                      |
| consequence: integer(\"consequence\").notNull(),                     |
|                                                                      |
| riskLevel: text(\"risk\_level\", { enum: \[\"low\", \"medium\",      |
| \"high\"\] }).notNull(),                                             |
|                                                                      |
| currentControls: text(\"current\_controls\"),                        |
|                                                                      |
| proposedAction: text(\"proposed\_action\"),                          |
|                                                                      |
| controlHierarchy: text(\"control\_hierarchy\", {                     |
|                                                                      |
| enum: \[\"eliminate\", \"substitute\", \"engineering\",              |
| \"administrative\", \"ppe\"\],                                       |
|                                                                      |
| }),                                                                  |
|                                                                      |
| costEstimate: integer(\"cost\_estimate\"),                           |
|                                                                      |
| owner: text(\"owner\"),                                              |
|                                                                      |
| dueDate: integer(\"due\_date\", { mode: \"timestamp\" }),            |
|                                                                      |
| completedAt: integer(\"completed\_at\", { mode: \"timestamp\" }),    |
|                                                                      |
| });                                                                  |
+----------------------------------------------------------------------+

**7.2 Migration strategy**

-   drizzle-kit generates SQL migrations checked into
    packages/db/migrations/.

-   Seeds run in a dedicated pnpm db:seed script that calls a Node
    loader reading packages/checklists/assets/seeds/\*.json.

-   Idempotent upsert by slug for templates, by code for legalReference,
    by slug for riskMatrix.

**8. Seed Data Catalogue**

The extractor (outputs/extract\_seeds.py) parses the vísir .docx files
with python-docx, walks each three-column table, detects section headers
vs criterion rows, and emits canonical JSON. Results are committed under
packages/checklists/assets/seeds/.

  --------------------------------- --------------------------- ---------------------------------------------
  **File**                          **Records**                 **Notes**
  seeds/woodworking-workshop.json   15 sections · 66 criteria   Vinnuumhverfisvísir fyrir Trésmíðaverkstæði
  seeds/construction-site.json      14 sections · 69 criteria   Vinnuumhverfisvísir fyrir byggingarsvæði
  seeds/legal\_references.json      10 entries                  Icelandic legal codes with canonical URLs
  seeds/risk\_matrices.json         3 matrices                  2×2, 3×3 (course), 5×5 (guide)
  seeds/manifest.json               inventory                   Read by packages/checklists loader
  --------------------------------- --------------------------- ---------------------------------------------

**8.1 Canonical checklist shape**

+----------------------------------------------------------------------+
| {                                                                    |
|                                                                      |
| \"slug\": \"woodworking-workshop\",                                  |
|                                                                      |
| \"sourceFile\": \"4.Vinnuumhvefisvísir fyrir                         |
| Trésmíðaverkstæði.docx\",                                            |
|                                                                      |
| \"version\": \"2026-04-11\",                                         |
|                                                                      |
| \"translations\": { \"is\": { \"title\": \"Vinnuumhverfisvísir fyrir |
| Trésmíðaverkstæði\" } },                                             |
|                                                                      |
| \"sections\": \[                                                     |
|                                                                      |
| {                                                                    |
|                                                                      |
| \"order\": 1,                                                        |
|                                                                      |
| \"translations\": { \"is\": { \"title\": \"Skipulag og virkni        |
| vinnuverndarstarfsins\" } },                                         |
|                                                                      |
| \"criteria\": \[                                                     |
|                                                                      |
| {                                                                    |
|                                                                      |
| \"number\": \"1\",                                                   |
|                                                                      |
| \"order\": 1,                                                        |
|                                                                      |
| \"legalRefs\": \[\"L-46/1980\", \"Rg-920/2006\"\],                   |
|                                                                      |
| \"translations\": {                                                  |
|                                                                      |
| \"is\": { \"title\": \"Er áhættumat í gildi?\", \"guidance\":        |
| \"\...\" }                                                           |
|                                                                      |
| }                                                                    |
|                                                                      |
| }                                                                    |
|                                                                      |
| \]                                                                   |
|                                                                      |
| }                                                                    |
|                                                                      |
| \]                                                                   |
|                                                                      |
| }                                                                    |
+----------------------------------------------------------------------+

**8.2 Risk matrix shape**

+---------------------------------------------------------------+
| {                                                             |
|                                                               |
| \"slug\": \"course-3x3\",                                     |
|                                                               |
| \"likelihoodLevels\": 3,                                      |
|                                                               |
| \"consequenceLevels\": 3,                                     |
|                                                               |
| \"lookup\": {                                                 |
|                                                               |
| \"1,1\": \"low\", \"1,2\": \"low\", \"1,3\": \"medium\",      |
|                                                               |
| \"2,1\": \"low\", \"2,2\": \"medium\", \"2,3\": \"high\",     |
|                                                               |
| \"3,1\": \"medium\",\"3,2\": \"high\", \"3,3\": \"high\"      |
|                                                               |
| },                                                            |
|                                                               |
| \"translations\": { \"is\": { \"title\": \"Námsefni 3x3\" } } |
|                                                               |
| }                                                             |
+---------------------------------------------------------------+

**9. API Surface**

All endpoints are Next.js 15 App Router route handlers under
apps/web/app/api. Zod schemas in packages/schemas define
request/response shapes and are imported by both server and client.

  ---------------------------------- ------------------------------------------- ----------------------------------------------------
  **Method + path**                  **Purpose**                                 **Key payload**
  POST /api/projects                 Create workplace + safety plan              { name, address, archetype, language }
  GET /api/projects                  List user\'s workplaces                     ---
  POST /api/assessments              Start assessment from template              { planId, templateId, matrixId }
  GET /api/assessments/:id           Full assessment graph                       ---
  PATCH /api/findings/:id            Update status / notes / photo / voice       { status, notes, photoIds }
  POST /api/risks/from-findings      Step 1b transfer                            { assessmentId }
  PATCH /api/risks/:id               Steps 2--5 edits                            { hazard, L, C, controls, owner, dueDate }
  PUT /api/assessments/:id/summary   Step 6 summary                              { company, location, date, people, method, notes }
  POST /api/templates/import         Import vísir from file or URL               multipart or { url }
  POST /api/photos                   Upload photo (exif → lat/lon)               multipart
  POST /api/transcribe               Audio → Icelandic text via sidecar          multipart
  POST /api/exports                  Build checklist/register/summary docx+pdf   { assessmentId, formats }
  POST /api/accidents                Log accident / near miss                    { type, severity, description }
  POST /api/chemicals                Inventory entry with SDS                    { commonName, cas, quantity }
  GET /api/reviews/upcoming          Review events due                           ---
  ---------------------------------- ------------------------------------------- ----------------------------------------------------

**10. Key Flows**

**10.1 Assessment lifecycle**

**Figure 10.1 --- Student / officer happy path**

Source: docs/diagrams/04-assessment-lifecycle-sequence.mmd

+----------------------------------------------------------------------+
| %% Assessment lifecycle --- student / safety officer happy path      |
|                                                                      |
| sequenceDiagram                                                      |
|                                                                      |
| actor User as Student / Officer                                      |
|                                                                      |
| participant Web as apps/web (UI)                                     |
|                                                                      |
| participant API as Route handlers                                    |
|                                                                      |
| participant DB as Drizzle / SQLite                                   |
|                                                                      |
| participant Risk as packages/risk                                    |
|                                                                      |
| participant Worker as doc-worker                                     |
|                                                                      |
| participant Export as packages/export                                |
|                                                                      |
| User-\>\>Web: Create workplace + safety plan                         |
|                                                                      |
| Web-\>\>API: POST /api/projects                                      |
|                                                                      |
| API-\>\>DB: insert workplace, safetyPlan                             |
|                                                                      |
| DB\--\>\>API: ids                                                    |
|                                                                      |
| API\--\>\>Web: plan created                                          |
|                                                                      |
| User-\>\>Web: Pick checklist template (wood/construction)            |
|                                                                      |
| Web-\>\>API: POST /api/assessments {templateId}                      |
|                                                                      |
| API-\>\>DB: insert riskAssessment, snapshot criteria                 |
|                                                                      |
| API\--\>\>Web: assessment ready                                      |
|                                                                      |
| loop For each criterion (step 1a)                                    |
|                                                                      |
| User-\>\>Web: Mark ok / notOk / n/a, notes, photo, voice             |
|                                                                      |
| Web-\>\>API: PATCH /api/findings/:id                                 |
|                                                                      |
| API-\>\>DB: upsert finding                                           |
|                                                                      |
| alt voice note attached                                              |
|                                                                      |
| Web-\>\>API: POST /api/transcribe                                    |
|                                                                      |
| API-\>\>Worker: audio blob                                           |
|                                                                      |
| Worker\--\>\>API: Icelandic transcript                               |
|                                                                      |
| API-\>\>DB: update finding.voiceTranscript                           |
|                                                                      |
| end                                                                  |
|                                                                      |
| end                                                                  |
|                                                                      |
| User-\>\>Web: Transfer non-compliant (step 1b)                       |
|                                                                      |
| Web-\>\>API: POST /api/risks/from-findings                           |
|                                                                      |
| API-\>\>DB: insert riskEntry rows                                    |
|                                                                      |
| loop Per risk entry (steps 2-5)                                      |
|                                                                      |
| User-\>\>Web: Fill hazard, health effects, L×C, controls, owner, due |
|                                                                      |
| Web-\>\>API: PATCH /api/risks/:id                                    |
|                                                                      |
| API-\>\>Risk: classify(matrixId, L, C)                               |
|                                                                      |
| Risk\--\>\>API: low\|medium\|high                                    |
|                                                                      |
| API-\>\>DB: persist                                                  |
|                                                                      |
| end                                                                  |
|                                                                      |
| User-\>\>Web: Complete summary (step 6)                              |
|                                                                      |
| Web-\>\>API: PUT /api/assessments/:id/summary                        |
|                                                                      |
| API-\>\>DB: upsert summary, set status=done                          |
|                                                                      |
| User-\>\>Web: Export bundle                                          |
|                                                                      |
| Web-\>\>API: POST /api/exports                                       |
|                                                                      |
| API-\>\>DB: load assessment graph                                    |
|                                                                      |
| API-\>\>Export: render docx templates                                |
|                                                                      |
| Export\--\>\>API: checklist.docx, register.docx, summary.docx        |
|                                                                      |
| API-\>\>Worker: convert to pdf                                       |
|                                                                      |
| Worker\--\>\>API: pdf files                                          |
|                                                                      |
| API\--\>\>Web: signed links                                          |
|                                                                      |
| Web\--\>\>User: download bundle                                      |
+----------------------------------------------------------------------+

**10.2 Checklist template import**

**Figure 10.2 --- Import from .docx or URL**

Source: docs/diagrams/05-checklist-import-sequence.mmd

+----------------------------------------------------------------------+
| %% Checklist template import --- admin / power user                  |
|                                                                      |
| sequenceDiagram                                                      |
|                                                                      |
| actor Admin                                                          |
|                                                                      |
| participant Web as apps/web                                          |
|                                                                      |
| participant API as /api/templates                                    |
|                                                                      |
| participant Worker as doc-worker (parser)                            |
|                                                                      |
| participant Checklists as packages/checklists                        |
|                                                                      |
| participant DB as Drizzle                                            |
|                                                                      |
| Admin-\>\>Web: Upload vísir .docx (or paste island.is URL)           |
|                                                                      |
| Web-\>\>API: POST /api/templates/import                              |
|                                                                      |
| alt URL provided                                                     |
|                                                                      |
| API-\>\>API: fetch document                                          |
|                                                                      |
| end                                                                  |
|                                                                      |
| API-\>\>Worker: POST /parse {file}                                   |
|                                                                      |
| Worker-\>\>Worker: python-docx walk tables                           |
|                                                                      |
| Worker\--\>\>API: {sections:\[{title,                                |
| criteria:\[{number,title,guidance,legalRefs}\]}\]}                   |
|                                                                      |
| API-\>\>Checklists: normalize + validate with Zod                    |
|                                                                      |
| Checklists\--\>\>API: canonical seed shape                           |
|                                                                      |
| API-\>\>DB: upsert checklistTemplate, sections, criteria,            |
| criterionTranslation(is)                                             |
|                                                                      |
| API-\>\>DB: upsert legalReference rows for new codes                 |
|                                                                      |
| DB\--\>\>API: counts                                                 |
|                                                                      |
| API\--\>\>Web: import report (added / updated / skipped)             |
|                                                                      |
| Web\--\>\>Admin: success + diff summary                              |
+----------------------------------------------------------------------+

**10.3 Accident → review trigger**

**Figure 10.3 --- Accident / incident review flow**

Source: docs/diagrams/06-accident-review-flow.mmd

+----------------------------------------------------------------------+
| %% Accident / incident → review trigger flow                         |
|                                                                      |
| flowchart TD                                                         |
|                                                                      |
| start(\[Incident occurs\]) \--\> log\[Log accident or                |
| near-miss\<br/\>POST /api/accidents\]                                |
|                                                                      |
| log \--\> classify{Severity?}                                        |
|                                                                      |
| classify \--\>\|minor\| store\[(Store in accident log)\]             |
|                                                                      |
| classify \--\>\|serious\| notify\[Flag for Vinnueftirlit             |
| notification\]                                                       |
|                                                                      |
| notify \--\> store                                                   |
|                                                                      |
| store \--\> link\[Link to affected criteria\<br/\>accident ×         |
| criterion\]                                                          |
|                                                                      |
| link \--\> review\[Create reviewEvent\<br/\>trigger = accident\]     |
|                                                                      |
| review \--\> due\[Set dueAt = now + 7 days\]                         |
|                                                                      |
| due \--\> task\[Appears on dashboard as action\]                     |
|                                                                      |
| task \--\> reassess{Reassess affected\<br/\>risk entries?}           |
|                                                                      |
| reassess \--\>\|yes\| update\[Update riskEntry L, C, controls\]      |
|                                                                      |
| reassess \--\>\|no\| close\[Complete review\]                        |
|                                                                      |
| update \--\> close                                                   |
|                                                                      |
| close \--\> done(\[reviewEvent.completedAt set\])                    |
|                                                                      |
| scheduled(\[Scheduled cadence\<br/\>annual or custom\]) \--\> review |
|                                                                      |
| regulation(\[Regulation change\]) \--\> review                       |
|                                                                      |
| change(\[Workplace change\]) \--\> review                            |
+----------------------------------------------------------------------+

**10.4 Assessment state machine**

**Figure 10.4 --- Assessment statuses**

Source: docs/diagrams/08-assessment-state.mmd

+----------------------------------------------------------------------+
| %% Risk assessment state machine                                     |
|                                                                      |
| stateDiagram-v2                                                      |
|                                                                      |
| \[\*\] \--\> draft: create from template                             |
|                                                                      |
| draft \--\> walkthrough: begin step 1a                               |
|                                                                      |
| walkthrough \--\> walkthrough: answer criterion                      |
|                                                                      |
| walkthrough \--\> transferred: step 1b --- non-compliant moved to    |
| register                                                             |
|                                                                      |
| transferred \--\> scoring: steps 2--5                                |
|                                                                      |
| scoring \--\> scoring: add hazard / L×C / controls                   |
|                                                                      |
| scoring \--\> summarised: step 6 summary filled                      |
|                                                                      |
| summarised \--\> exported: bundle generated                          |
|                                                                      |
| exported \--\> archived: plan reviewCadence rolls                    |
|                                                                      |
| archived \--\> draft: next cycle (reviewEvent)                       |
|                                                                      |
| walkthrough \--\> abandoned: user discards                           |
|                                                                      |
| scoring \--\> abandoned                                              |
|                                                                      |
| abandoned \--\> \[\*\]                                               |
+----------------------------------------------------------------------+

**11. Deployment Topology and NFRs**

**Figure 11.1 --- Local dev vs production**

Source: docs/diagrams/07-deployment-topology.mmd

+----------------------------------------------------------------+
| %% Deployment topology --- local dev and production            |
|                                                                |
| flowchart LR                                                   |
|                                                                |
| subgraph dev\[\"Local dev (docker compose)\"\]                 |
|                                                                |
| devWeb\[\"apps/web\<br/\>next dev :3000\"\]                    |
|                                                                |
| devWorker\[\"doc-worker\<br/\>uvicorn :8000\"\]                |
|                                                                |
| devSqlite\[(\"sqlite file\<br/\>./data/vindhlif.db\")\]        |
|                                                                |
| devMedia\[(\"./media/\")\]                                     |
|                                                                |
| devWeb \--\> devSqlite                                         |
|                                                                |
| devWeb \--\> devMedia                                          |
|                                                                |
| devWeb \--\> devWorker                                         |
|                                                                |
| end                                                            |
|                                                                |
| subgraph prod\[\"Production (single host or small cluster)\"\] |
|                                                                |
| proxy\[\"Caddy / Nginx\<br/\>TLS + routing\"\]                 |
|                                                                |
| subgraph webCt\[\"web container\"\]                            |
|                                                                |
| nextNode\[\"Next.js standalone\<br/\>Node 22\"\]               |
|                                                                |
| end                                                            |
|                                                                |
| subgraph workerCt\[\"worker container\"\]                      |
|                                                                |
| py\[\"FastAPI + Whisper + LibreOffice\"\]                      |
|                                                                |
| end                                                            |
|                                                                |
| pg\[(\"Postgres 16\")\]                                        |
|                                                                |
| obj\[(\"Object storage\<br/\>S3 / MinIO\")\]                   |
|                                                                |
| proxy \--\> nextNode                                           |
|                                                                |
| nextNode \--\> pg                                              |
|                                                                |
| nextNode \--\> obj                                             |
|                                                                |
| nextNode \--\>\|HTTP\| py                                      |
|                                                                |
| py \--\> obj                                                   |
|                                                                |
| end                                                            |
|                                                                |
| devWeb -. docker build .-\> nextNode                           |
|                                                                |
| devWorker -. docker build .-\> py                              |
+----------------------------------------------------------------+

**11.1 Non-functional requirements**

  --------------- -----------------------------------------------------------------------------------
  **Category**    **Requirement**
  Performance     Assessment page loads \<1.5 s with 150 criteria; finding save \<300 ms p95
  Availability    Single-host deployment acceptable for v1; nightly backups of sqlite/Postgres
  Accessibility   WCAG 2.1 AA; keyboard-only capture flow; lang attributes on content
  i18n            All UI strings via dict; no hard-coded Icelandic in components
  Offline         Assessment page is PWA-cached; queues findings locally when offline
  Privacy         Media stored outside of DB; photos stripped of EXIF on export unless user opts in
  Security        CSRF on mutating routes; ownerId enforced server-side; upload MIME sniffing
  Observability   pino structured logs; OpenTelemetry traces from API to doc-worker
  --------------- -----------------------------------------------------------------------------------

**11.2 Testing strategy**

-   Vitest units --- risk classify function, Zod schemas, seed loader,
    checklist parser.

-   Playwright E2E --- full student happy path (create plan → assess →
    export).

-   Contract tests --- doc-worker FastAPI routes with pytest + httpx.

-   Golden file tests --- exported docx compared against committed
    reference files.

-   Linguistic QA --- native Icelandic review of seed data and UI
    labels.

-   Accessibility --- axe-core in Playwright for every screen.

**12. Delivery Plan and User Stories**

**12.1 Staged milestones**

  -------------------------- -------------- ---------------------------------------------------------------------------------------------
  **Stage**                  **Duration**   **Outcome**
  S0 · Foundations           1 week         Monorepo scaffolded, Drizzle schema compiled, seeds loaded, CI green
  S1 · MVP assignment        3 weeks        Student happy path: create plan → run wood/construction checklist → summary → export bundle
  S2 · Written safety plan   3 weeks        Accidents, chemicals, emergency plan, policies, training, review cadence
  S3 · Polish + reuse        2 weeks        Import vísir from URL, i18n English UI, PWA offline, audit of accessibility
  -------------------------- -------------- ---------------------------------------------------------------------------------------------

**12.2 Epics, stories, and agent team assignment**

Stories are grouped by the agent team that owns them (see Section 13).
Each story is small enough to complete inside one working session and
has a concrete acceptance criterion. Dependencies across teams are
called out with DEP.

**12.2.1 Data Team**

**• D-01 --- Commit seed JSON from both vísar**

As a developer, I want checklist seeds for woodworking and construction
to be checked into the repo so that the database can be bootstrapped
without network access.

Acceptance: packages/checklists/assets/seeds/\*.json present; pnpm db:seed produces 15+14
sections and 66+69 criteria.

**• D-02 --- Parser bridge in doc-worker**

As a power user, I want to upload a new vísir .docx and have it
normalised into the same shape so that additional workplace archetypes
can be added without redeploying.

Acceptance: POST /parse returns canonical JSON for a test vísir; schema
validated in CI.

**• D-03 --- Legal reference catalogue loader**

As a developer, I want legal codes to be upserted idempotently from
legal\_references.json so that criteria resolve to canonical URLs.

Acceptance: Duplicate seed runs do not create duplicate rows; 10 codes
present after seed.

**• D-04 --- Risk matrix seeding**

As a developer, I want 2×2, 3×3, and 5×5 matrices available from day 1
so that users can switch matrices per assessment.

Acceptance: riskMatrix table contains three rows with lookup JSON
deserialisable by packages/risk.

**12.2.2 Core Team**

**• C-01 --- Drizzle schema + initial migration**

As a developer, I want the full schema compiled with type-safe Drizzle
queries so that all teams can import typed tables.

Acceptance: drizzle-kit generate produces a migration; pnpm build passes
across packages.

DEP: D-01

**• C-02 --- Zod contract package**

As a developer, I want Zod schemas mirroring the Drizzle tables so that
UI and API share a single source of truth.

Acceptance: packages/schemas exports ProjectInput, AssessmentView,
FindingPatch, RiskEntryPatch.

**• C-03 --- Risk classify function**

As a assessor, I want L×C to resolve to low/medium/high via the pinned
matrix so that scores remain stable across matrix revisions.

Acceptance: classify(matrixId, L, C) unit tested against all three
matrices.

DEP: D-04

**• C-04 --- getCurrentUser() auth seam**

As a architect, I want a single helper that returns the active user so
that real auth can be dropped in later without touching routes.

Acceptance: All API routes import getCurrentUser; dev build returns a
placeholder user.

**• C-05 --- Assessment graph loader**

As a UI dev, I want GET /api/assessments/:id to return plan + findings +
risks + summary in one payload so that the assessment page avoids
waterfall fetches.

Acceptance: Response matches AssessmentView Zod; query count ≤3 on
sqlite.

**12.2.3 Frontend Team**

**• F-01 --- App Router shell and navigation**

As a student, I want a left nav with Projects, Plan, Library, Imports,
Settings so that I can find my work.

Acceptance: All routes render; layout is responsive 375 px → 1440 px.

**• F-02 --- Project creation form**

As a student, I want to create a workplace by picking archetype and
language so that my plan is seeded correctly.

Acceptance: Zod-validated form; server persists workplace and safetyPlan
in one transaction.

DEP: C-02

**• F-03 --- Checklist walk-through UI**

As a student, I want to step through each criterion with ok / not ok /
n/a, notes, photos so that I complete step 1a.

Acceptance: Keyboard-accessible; autosave \<300 ms; progress bar per
section.

DEP: C-05

**• F-04 --- i18n dictionary**

As a user, I want the UI to read labels from a dict indexed by key and
language so that English can be added without refactoring components.

Acceptance: No raw Icelandic strings in packages/ui components; lint
rule enforces it.

**• F-05 --- Risk register editor**

As a student, I want a table of riskEntry rows with inline L×C selector
and live level badge so that steps 2--5 are visible at a glance.

Acceptance: Editing L/C triggers classify and updates badge; optimistic
UI with TanStack Query.

DEP: C-03

**• F-06 --- Summary (step 6) form**

As a student, I want a single form with company, location, date, people,
method, notes so that I can finalise the assessment.

Acceptance: Pre-fills from workplace; validation gates export.

**12.2.4 Field Team**

**• Fi-01 --- Photo capture + EXIF geotag**

As a foreman, I want to attach photos to a finding from the phone camera
so that evidence is collected on site.

Acceptance: Photo stored in media/; lat/lon extracted; thumbnail
rendered.

**• Fi-02 --- Voice note capture + transcribe**

As a foreman, I want to speak a note in Icelandic and have it
transcribed so that I do not type on-site.

Acceptance: Audio uploaded; /api/transcribe returns text;
finding.voiceTranscript set.

DEP: C-05

**• Fi-03 --- Offline queue**

As a foreman, I want findings to persist locally when offline and sync
on reconnect so that I can work in basements and sites with poor
reception.

Acceptance: Service worker caches the assessment route; queued mutations
retry on reconnect.

**12.2.5 Export Team**

**• E-01 --- Checklist export template**

As a inspector, I want a filled checklist docx matching the vísir layout
so that I can grade or file it.

Acceptance: docxtemplater template in
packages/export/templates/checklist.docx; golden file test.

**• E-02 --- Action register export**

As a inspector, I want the riskEntry rows rendered into the official
skraning form so that the deliverable is teacher-ready.

Acceptance: Register columns match PDF source; empty rows trimmed; dates
locale-formatted.

**• E-03 --- Samantekt (step 6) export**

As a inspector, I want the 6-step summary form filled from the summary
entity so that the student submits all three files.

Acceptance: All five fields populated; header includes workplace + date.

**• E-04 --- Bundle → PDF via doc-worker**

As a student, I want a single zip of docx + pdf versions so that I can
submit in one upload.

Acceptance: POST /api/exports returns a signed URL to a zip containing
six files.

**12.2.6 Safety-Plan Team**

**• P-01 --- Accident log**

As a officer, I want to record accidents and near-misses linked to the
plan so that Rg-920/2006 obligations are met.

Acceptance: accident table populated; list view filterable by severity
and date.

**• P-02 --- Chemical inventory with SDS**

As a officer, I want to register chemicals and attach SDS PDFs so that
Rg-553/2004 duties are discharged.

Acceptance: chemical + sdsAttachment rows; SDS preview inline.

**• P-03 --- Emergency plan editor**

As a officer, I want to maintain evacuation routes, first-aid, and fire
suppression so that the written plan is complete.

Acceptance: emergencyPlan singleton per safetyPlan; last updated
timestamp rendered.

**• P-04 --- Harassment policy (Rg-1009/2015)**

As a officer, I want a versioned harassment policy document attached to
the plan so that compliance is auditable.

Acceptance: policy row with kind=\'harassment\'; prior versions
retained.

**• P-05 --- Training plan**

As a officer, I want to describe induction and ongoing training coverage
so that non-native workers are documented.

Acceptance: trainingPlan entity editable; language coverage field.

**• P-06 --- Review cadence + triggers**

As a officer, I want scheduled, accident, change, regulation triggers to
create reviewEvent rows so that the plan stays current.

Acceptance: reviewEvent creation covered in flow 10.3; dashboard
surfaces upcoming events.

**12.2.7 Ops Team**

**• O-01 --- Docker Compose dev stack**

As a developer, I want one command to run web + doc-worker + storage
locally so that onboarding is fast.

Acceptance: docker compose up spins up apps/web, doc-worker, sqlite
volume, media volume.

**• O-02 --- CI pipeline**

As a maintainer, I want lint, typecheck, unit, e2e, and golden file
tests on every PR so that regressions are caught early.

Acceptance: GitHub Actions workflow green on main; artefacts uploaded on
failure.

**• O-03 --- Observability baseline**

As a operator, I want structured pino logs and OTel traces so that
production issues are diagnosable.

Acceptance: Trace spans web → /api → doc-worker visible in a local
Jaeger.

**• O-04 --- Backups**

As a operator, I want nightly dumps of the DB and media volume so that
data loss is bounded.

Acceptance: Cron in compose; 7-day retention configurable via env.

**12.2.8 QA Team**

**• Q-01 --- Happy path Playwright**

As a QA, I want an E2E covering create plan → run checklist → summary →
export so that the MVP is regression-protected.

Acceptance: Test green on wood and construction templates.

**• Q-02 --- Linguistic review of seeds**

As a QA, I want native Icelandic review of parsed section and criterion
titles so that teachers accept the output.

Acceptance: Review log committed; diffs applied before S1 exit.

**• Q-03 --- Accessibility sweeps**

As a QA, I want axe-core run on every route so that AA is maintained.

Acceptance: No serious or critical violations in CI.

**13. Suggested Agent Team Breakdown**

The work can be parallelised across eight lightweight agent teams
coordinated by a Product / Architect owner. The diagram below shows
dependencies; Section 12.2 lists the stories each team claims.

**Figure 13.1 --- Agent team dependencies**

Source: docs/diagrams/09-agent-team-breakdown.mmd

+----------------------------------------------------------------------+
| %% Suggested agent team breakdown for parallel implementation        |
|                                                                      |
| flowchart TB                                                         |
|                                                                      |
| po(\[Product / Architect\<br/\>owns backlog, acceptance\])           |
|                                                                      |
| subgraph teams\[\"Specialised agent teams\"\]                        |
|                                                                      |
| data\[\"Data Team\<br/\>· seed extractor\<br/\>· parser              |
| bridge\<br/\>· legal catalogue\<br/\>· risk matrices\"\]             |
|                                                                      |
| core\[\"Core Team\<br/\>· Drizzle schema\<br/\>· migrations\<br/\>·  |
| Zod contracts\<br/\>· risk engine\"\]                                |
|                                                                      |
| front\[\"Frontend Team\<br/\>· app router shell\<br/\>· shadcn       |
| design system\<br/\>· forms + i18n dict\<br/\>· TanStack Query\"\]   |
|                                                                      |
| field\[\"Field Team\<br/\>· capture flow\<br/\>· photo +             |
| geotag\<br/\>· voice + transcribe UI\<br/\>· offline PWA\"\]         |
|                                                                      |
| exp\[\"Export Team\<br/\>· docxtemplater\<br/\>· LibreOffice         |
| PDF\<br/\>· bundle builder\"\]                                       |
|                                                                      |
| ops\[\"Ops Team\<br/\>· docker compose\<br/\>· CI                    |
| (lint/test/e2e)\<br/\>· observability\<br/\>· backups\"\]            |
|                                                                      |
| qa\[\"QA Team\<br/\>· Vitest units\<br/\>· Playwright flows\<br/\>·  |
| accessibility\<br/\>· Icelandic linguistic QA\"\]                    |
|                                                                      |
| end                                                                  |
|                                                                      |
| po \--\> data                                                        |
|                                                                      |
| po \--\> core                                                        |
|                                                                      |
| po \--\> front                                                       |
|                                                                      |
| po \--\> field                                                       |
|                                                                      |
| po \--\> exp                                                         |
|                                                                      |
| po \--\> ops                                                         |
|                                                                      |
| po \--\> qa                                                          |
|                                                                      |
| data \--\> core                                                      |
|                                                                      |
| core \--\> front                                                     |
|                                                                      |
| core \--\> exp                                                       |
|                                                                      |
| front \--\> field                                                    |
|                                                                      |
| front \--\> qa                                                       |
|                                                                      |
| exp \--\> qa                                                         |
|                                                                      |
| ops \--\> qa                                                         |
+----------------------------------------------------------------------+

  ------------- ------------------------------------------------------------------- -----------------------------------------------------------
  **Team**      **Responsibility**                                                  **Primary packages / surfaces**
  Data          Seeds, parser, legal catalogue, matrices                            extract\_seeds.py, packages/checklists, doc-worker/parser
  Core          Schema, migrations, Zod, risk engine, auth seam                     packages/db, packages/schemas, packages/risk
  Frontend      App shell, design system, forms, i18n                               apps/web, packages/ui
  Field         Photo, voice, offline capture                                       apps/web/app/capture, doc-worker/whisper
  Export        docxtemplater templates + bundler                                   packages/export, doc-worker/libreoffice
  Safety-Plan   Accidents, chemicals, emergency plan, policies, training, reviews   apps/web API routes + UI
  Ops           Docker, CI, observability, backups                                  docker-compose.yml, .github/workflows
  QA            Tests, accessibility, linguistic review                             apps/web/e2e, packages/\*/test
  ------------- ------------------------------------------------------------------- -----------------------------------------------------------

**14. Definition of Done**

-   Code compiles on Node 22 and passes strict TypeScript.

-   Unit tests cover new logic; Vitest green on CI.

-   If user-facing: Playwright E2E added or updated and green.

-   No hard-coded Icelandic strings in components (lint rule).

-   Translation tables updated for any new entity requiring labels.

-   ownerId filter present on any new query touching user data.

-   Zod schema exported from packages/schemas for any new payload.

-   Docs in README or this handoff updated for any new endpoint or
    entity.

-   Accessibility: axe-core scan clean for new routes.

**15. Risks and Open Questions**

  -------- ------------------------------------------------------------- ---------------------------------------------------------------------------
  **\#**   **Risk**                                                      **Mitigation**
  R1       Vísir parser fragility across document versions               Golden files per version; parser surfaces a dry-run diff in the import UI
  R2       Whisper Icelandic accuracy on noisy sites                     Allow manual correction; store raw audio; re-transcribe later
  R3       LibreOffice conversion drift vs teacher template              Lock template versions; golden pdf comparison in CI
  R4       Auth deferral leaks data between users in multi-user trials   Enforce ownerId server-side from day 1 via getCurrentUser()
  R5       Translation table sprawl for future languages                 Central migration helper; one translation table per entity, not per field
  R6       Offline sync conflicts                                        Last-write-wins on finding; conflicts visible in an activity log
  -------- ------------------------------------------------------------- ---------------------------------------------------------------------------

**15.1 Open questions for the architect**

-   Should safetyPlan be multi-tenant (orgId) from day 1, or is ownerId
    enough for v1?

-   Is offline PWA mandatory for S1, or acceptable in S3?

-   Do we commit Postgres as the default prod target, or keep sqlite
    viable for small sites?

-   Do we host doc-worker in-cluster or as a standalone service from the
    start?

**16. Appendix --- Source Material Inventory**

  ----------------------------------------------------- --------------------------------------------------------------------
  **File in Verkefni4**                                 **Role**
  1.Verkefni\_IV.docx                                   Assignment brief; three workplace options; submission deliverables
  2.skraning\_og\_adgerdaaaetlun.pdf                    Action register template → riskEntry columns
  3.samantekt\_6\_skref\_ahaettumats.pdf                Step 6 summary template → summary entity
  4.Vinnuumhvefisvísir fyrir Trésmíðaverkstæði.docx     Seeded as woodworking-workshop
  5.Vinnuumhvefisvísir fyrir byggingarsvæði.docx        Seeded as construction-site
  6.áhættugreining 4-6-skref leiðbeinandi lesefni.pdf   Methodology + 3×3 matrix
  7.ahaettumat-leidbeiningar.pdf                        Vinnueftirlit guide + 5×5 matrix + hierarchy of controls
  8.Reglur nr. 547/1996 ...                             Construction archetype rules
  ----------------------------------------------------- --------------------------------------------------------------------

**16.1 Handoff artefact index**

-   packages/checklists/assets/seeds/manifest.json

-   packages/checklists/assets/seeds/woodworking-workshop.json

-   packages/checklists/assets/seeds/construction-site.json

-   packages/checklists/assets/seeds/legal\_references.json

-   packages/checklists/assets/seeds/risk\_matrices.json

-   docs/diagrams/01-system-context.mmd

-   docs/diagrams/02-container-architecture.mmd

-   docs/diagrams/03-data-model-erd.mmd

-   docs/diagrams/04-assessment-lifecycle-sequence.mmd

-   docs/diagrams/05-checklist-import-sequence.mmd

-   docs/diagrams/06-accident-review-flow.mmd

-   docs/diagrams/07-deployment-topology.mmd

-   docs/diagrams/08-assessment-state.mmd

-   docs/diagrams/09-agent-team-breakdown.mmd
