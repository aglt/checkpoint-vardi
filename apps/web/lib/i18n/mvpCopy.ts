import type {
  AssessmentSummaryRequiredField,
  RiskMitigationActionStatus,
} from "@vardi/schemas";
import type { RiskLevel } from "@vardi/risk";
import type {
  AssessmentProgressionBlocker,
  AssessmentProgressionCompletionState,
  AssessmentProgressionStepId,
  AssessmentProgressionStepStatus,
} from "@/lib/assessments/loadAssessmentProgressionProjection";

import { getRequestLocale, type AppLanguage } from "./appLanguage";

export const START_ASSESSMENT_FORM_ERROR_CODES = [
  "invalid-start-request",
  "unknown-template",
  "start-unavailable",
] as const;

export type StartAssessmentFormErrorCode =
  (typeof START_ASSESSMENT_FORM_ERROR_CODES)[number];

export const ANSWER_OPTION_COPY = {
  is: [
    {
      value: "ok",
      label: "Í lagi",
      description: "Uppfyllir núverandi kröfu.",
    },
    {
      value: "notOk",
      label: "Ekki í lagi",
      description: "Krefst eftirfylgni í síðari skrefum.",
    },
    {
      value: "notApplicable",
      label: "Á ekki við",
      description: "Á ekki við í þessu samhengi.",
    },
  ],
  en: [
    {
      value: "ok",
      label: "Ok",
      description: "Meets the current expectation.",
    },
    {
      value: "notOk",
      label: "Not ok",
      description: "Needs follow-up in a later story.",
    },
    {
      value: "notApplicable",
      label: "Not applicable",
      description: "Does not apply in this context.",
    },
  ],
} as const;

const START_PAGE_COPY = {
  is: {
    eyebrow: "Núverandi MVP inngangur",
    title: "Hefja staðlað áhættumat og taka yfirferðina í næsta skrefi.",
    description:
      "Þessi síða er afmörkuð MVP inngangssíða fyrir S1-03. Hún býr til vinnustaðasamhengi, festir staðlaðan gátlista og 3x3 námsfylki og undirbýr matið fyrir yfirferðarflæðið.",
    summaryLabels: {
      templates: "Sniðmát",
      pinnedMatrix: "Fast fylki",
      scope: "Umfang",
    },
    summaryValues: {
      pinnedMatrix: "Námskeið 3x3",
      scope: "Aðeins upphaf",
    },
    sectionHeading: "Hefja áhættumat",
    sectionDescription:
      "Veldu vinnustaðasamhengi og eitt af staðlaðri sniðmátunum hér að neðan. Þetta form sleppir viljandi vali á fylki, samhæfisreglum og innihaldi yfirferðar.",
    formErrorMessages: {
      "invalid-start-request":
        "Ekki tókst að lesa upphafsbeiðnina. Athugaðu formið og reyndu aftur.",
      "unknown-template":
        "Valda staðlaða sniðmátið er ekki lengur tiltækt.",
      "start-unavailable": "Ekki er hægt að hefja matið í bili.",
    },
    labels: {
      workplaceName: "Nafn vinnustaðar",
      workplaceAddress: "Heimilisfang",
      workplaceArchetype: "Gerð vinnustaðar",
      seededTemplate: "Staðlað sniðmát",
    },
    placeholders: {
      workplaceName: "FB verkstæði",
      workplaceAddress: "Austurberg 5",
    },
    archetypes: {
      fixed: {
        label: "Fastur",
        description: "Stöðugur vinnustaður með hægari breytingum í rekstri.",
      },
      mobile: {
        label: "Færanlegur",
        description: "Hópur eða búnaður flyst milli vinnustaða.",
      },
      construction: {
        label: "Byggingarsvæði",
        description: "Byggingarumhverfi með breytilegum aðstæðum.",
      },
    },
    submit: "Búa til áhættumat",
  },
  en: {
    eyebrow: "Current MVP Start Entry",
    title: "Start a seeded assessment and leave the walkthrough for the next step.",
    description:
      "This screen is the narrow MVP entry route for S1-03. It creates a workplace context, pins a seeded checklist and the course 3x3 matrix, and prepares the assessment for the walkthrough flow.",
    summaryLabels: {
      templates: "Templates",
      pinnedMatrix: "Pinned matrix",
      scope: "Scope",
    },
    summaryValues: {
      pinnedMatrix: "Course 3x3",
      scope: "Start only",
    },
    sectionHeading: "Start assessment",
    sectionDescription:
      "Choose a workplace context and one of the seeded templates below. This form intentionally skips matrix choice, compatibility rules, and walkthrough content.",
    formErrorMessages: {
      "invalid-start-request":
        "The start request was incomplete. Please check the form and try again.",
      "unknown-template":
        "The selected seeded template is not available anymore.",
      "start-unavailable": "Assessment start is temporarily unavailable.",
    },
    labels: {
      workplaceName: "Workplace name",
      workplaceAddress: "Address",
      workplaceArchetype: "Workplace archetype",
      seededTemplate: "Seeded template",
    },
    placeholders: {
      workplaceName: "FB workshop",
      workplaceAddress: "Austurberg 5",
    },
    archetypes: {
      fixed: {
        label: "Fixed",
        description: "Steady site with slower operational change.",
      },
      mobile: {
        label: "Mobile",
        description: "Crew or equipment moves between work locations.",
      },
      construction: {
        label: "Construction",
        description: "Construction-focused environment with changing conditions.",
      },
    },
    submit: "Create assessment",
  },
} as const;

const WALKTHROUGH_COPY = {
  is: {
    eyebrow: "Gátlisti",
    description:
      "Farðu í gegnum gátlistann lið fyrir lið. Veldu svar, bættu við athugasemd ef þarf og vistaðu svo handvirkt. Þú getur alltaf opnað vistað atriði aftur og breytt því.",
    progressLabel: "Framvinda",
    checklistHeading: "Yfirlit gátlista",
    checklistDescription:
      "Veldu kafla til vinstri og síðan eitt atriði úr listanum. Áherslan hér er að klára gátlistann skýrt og rólega áður en þú ferð í næstu skref.",
    sectionsHeading: "Kaflar",
    criteriaHeading: "Atriði í þessum kafla",
    criteriaDescription:
      "Vistaðir liðir haldast breytanlegir. Atriði fara ekki í nýtt vistað ástand fyrr en þú ýtir á vista.",
    editableHint:
      "Veldu eitt atriði, svaraðu, bættu við athugasemd ef þarf og vistaðu svo. Þú getur alltaf komið aftur og breytt vistuðu atriði.",
    summaryLabels: {
      checklist: "Gátlisti",
      sectionsComplete: "Loknir kaflar",
      pinnedMatrix: "Fast fylki",
    },
    transfer: {
      eyebrow: "Næsta skref",
      heading: "Færa í áhættuskrá",
      description:
        "Þegar þú hefur vistað atriði sem eru merkt 'Ekki í lagi' geturðu fært þau héðan í áhættuskrána. Endurkeyrsla bætir aðeins við því sem vantar.",
      metrics: {
        eligibleFindings: "Hæf atriði",
        alreadyTransferred: "Þegar færð",
        remainingToTransfer: "Eftir að færa",
      },
    },
    sectionLabel: "Kafli",
    criterionLabel: "Atriði",
    notesLabel: "Athugasemdir",
    notesPlaceholder: "Samhengi, staðsetning eða nánari eftirfylgni...",
    saveAction: "Vista atriði",
    previousCriterion: "Fyrra atriði",
    nextCriterion: "Næsta atriði",
    retrySave: "Reyna aftur að vista",
    savePills: {
      saving: "Vistar...",
      error: "Vistun brást",
      needsAnswer: "Vantar svar",
      unsaved: "Tilbúið að vista",
      notStarted: "Óunnið",
      saved: "Vistað",
    },
    transferPills: {
      present: "Fært",
      absent: "Vantar færslu",
    },
    fallbacks: {
      criterionSave: "Ekki tókst að vista þetta atriði.",
      transfer: "Ekki tókst að færa þessi atriði í áhættuskrána í bili.",
    },
  },
  en: {
    eyebrow: "Checklist",
    description:
      "Work through the checklist one item at a time. Choose an answer, add notes when needed, and save explicitly. You can reopen any saved item and edit it later.",
    progressLabel: "Progress",
    checklistHeading: "Checklist overview",
    checklistDescription:
      "Choose a section on the left and then one item from the list. The focus here is to complete the checklist clearly before moving into later steps.",
    sectionsHeading: "Sections",
    criteriaHeading: "Items in this section",
    criteriaDescription:
      "Saved items stay editable. An item only moves into its saved state after you click save.",
    editableHint:
      "Choose one item, answer it, add notes if needed, and then save it. You can always come back and edit a saved item later.",
    summaryLabels: {
      checklist: "Checklist",
      sectionsComplete: "Sections complete",
      pinnedMatrix: "Pinned matrix",
    },
    transfer: {
      eyebrow: "Next step",
      heading: "Transfer to risk register",
      description:
        "Once you have saved items marked 'Not ok', move them from here into the risk register. Re-running only adds anything that is still missing.",
      metrics: {
        eligibleFindings: "Eligible findings",
        alreadyTransferred: "Already transferred",
        remainingToTransfer: "Remaining to transfer",
      },
    },
    sectionLabel: "Section",
    criterionLabel: "Criterion",
    notesLabel: "Notes",
    notesPlaceholder: "Context, location, or follow-up detail...",
    saveAction: "Save item",
    previousCriterion: "Previous item",
    nextCriterion: "Next item",
    retrySave: "Retry save",
    savePills: {
      saving: "Saving...",
      error: "Save issue",
      needsAnswer: "Needs answer",
      unsaved: "Ready to save",
      notStarted: "Not started",
      saved: "Saved",
    },
    transferPills: {
      present: "Transferred",
      absent: "Needs transfer",
    },
    fallbacks: {
      criterionSave: "We could not save this walkthrough answer.",
      transfer: "We could not transfer these findings right now.",
    },
  },
} as const;

const RISK_REGISTER_COPY = {
  is: {
    eyebrow: "Skref 2-5",
    heading: "Áhættuskrá",
    description:
      "Færðar raðir haldast breytanlegar inni í þessu mati. Vistun á áhættufærslu heldur vistuðum alvarleika í samræmi við fasta fylkið, en mótvægisaðgerðir vistast sem aðskildur undirliggjandi sannleikur sem útflutningur getur síðar notað.",
    emptyState:
      "Merktu atriði í yfirferð sem 'Ekki í lagi' og færðu það í áhættuskrána til að opna breytanlegar raðir hér.",
    transferredFromWalkthrough:
      "Fært úr yfirferðinni. Vistaðu þessa röð til að laga eða uppfæra vistaðan alvarleika. Vistaðar mótvægisaðgerðir hér fyrir neðan haldast aðskilinn sannleikur.",
    staleClassification:
      "Vistaður alvarleiki er úreltur. Vistaðu færsluna til að laga það.",
    invalidClassification:
      "Ekki tókst að staðfesta vistaðan alvarleika. Vistaðu færsluna til að laga það.",
    labels: {
      criterion: "Atriði",
      hazard: "Hætta",
      healthEffects: "Möguleg heilsufarsáhrif",
      whoAtRisk: "Hverjir eru í hættu",
      currentControls: "Núverandi varnir",
      proposedAction: "Næsta aðgerð",
      classification: "Alvarleikaval",
      likelihood: "Líkur",
      consequence: "Afleiðing",
      classificationReasoning: "Rökstuðningur fyrir flokkun",
      costEstimate: "Kostnaðarmat",
      responsibleOwner: "Ábyrgðaraðili",
      dueDate: "Áætluð dagsetning",
      completedAt: "Lokið",
      savedLevel: "Alvarleiki",
      mitigationDescription: "Lýsing",
      mitigationAssignee: "Ábyrgðaraðili",
      mitigationDueDate: "Lokadagsetning",
      mitigationStatus: "Staða",
    },
    placeholders: {
      hazard: "Lýstu hættunni...",
      healthEffects: "Möguleg slys eða heilsufarsáhrif...",
      whoAtRisk: "Hvaða hlutverk eða einstaklingar verða fyrir áhrifum...",
      classificationReasoning: "Hvers vegna passar þessi flokkun við aðstæðurnar?",
      currentControls: "Hvað er þegar í gildi?",
      proposedAction: "Hvað á að gera næst?",
      costEstimate: "0",
      responsibleOwner: "Hver ber ábyrgð á næsta skrefi?",
      mitigationDescription: "Lýstu mótvægisaðgerðinni...",
      mitigationAssignee: "Hver ber ábyrgð á þessari aðgerð?",
    },
    classificationDescription:
      "Veldu nafngefinn alvarleika og síðan nákvæma samsetningu líkindis og afleiðingar innan hans. Þjónninn vistar nákvæmu gildin og leiðir vistaðan alvarleika af fasta fylkinu.",
    clear: "Hreinsa",
    savePills: {
      saving: "Vistar...",
      error: "Vandamál við vistun",
      unsaved: "Óvistað",
      saved: "Vistað",
    },
    saveButton: "Vista áhættufærslu",
    saveButtonSaving: "Vista áhættufærslu...",
    riskLevel: {
      needsRepair: "Þarf lagfæringu",
      incomplete: "Ólokið",
      saveToRefresh: "Vista til að uppfæra",
    },
    workflowRules: {
      justificationRequired:
        "Þetta snið krefst vistaðrar röksemdar fyrir þessari flokkun áður en áhættuskráin og útflutningur teljast tilbúin.",
      mitigationRequired:
        "Þetta snið krefst að minnsta kosti einnar vistaðrar mótvægisaðgerðar fyrir þetta áhættustig áður en áhættuskráin og útflutningur teljast tilbúin.",
    },
    mitigation: {
      heading: "Mótvægisaðgerðir",
      description:
        "Vistaðar aðgerðir tilheyra þessari áhættufærslu. Staðbundin drög haldast í vafranum þar til þú vistar þau og aðeins vistaðar aðgerðir birtast í útflutningi.",
      addAction: "Bæta við aðgerð",
      emptyState:
        "Engar vistaðar mótvægisaðgerðir enn. Bættu við drögum hér þegar þessi áhættufærsla þarf skýrt næsta skref.",
      cardHelper:
        "Hafðu hverja aðgerð skýra svo hún geti birst sannlega í síðari útflutningi.",
      removeDraft: "Fjarlægja drög",
      deleteAction: "Eyða aðgerð",
      deletingAction: "Eyði aðgerð...",
      createAction: "Búa til aðgerð",
      creatingAction: "Bý til aðgerð...",
      saveAction: "Vista aðgerð",
      savingAction: "Vista aðgerð...",
      savingExisting: "Vistar...",
      creating: "Býr til...",
      deleting: "Eyðir...",
      issue: "Vandamál",
      draft: "Drög",
      descriptionRequired:
        "Lýsing er nauðsynleg áður en hægt er að vista þessa mótvægisaðgerð.",
      fallbacks: {
        save: "Ekki tókst að vista þessa mótvægisaðgerð.",
        delete: "Ekki tókst að eyða þessari mótvægisaðgerð.",
      },
      statuses: {
        open: "Opin",
        inProgress: "Í vinnslu",
        done: "Lokið",
      },
    },
    fallbacks: {
      save: "Ekki tókst að vista þessa áhættufærslu.",
    },
  },
  en: {
    eyebrow: "Steps 2-5",
    heading: "Risk register",
    description:
      "Transferred rows stay editable inside this assessment flow. Saving a risk entry keeps the stored severity aligned with the pinned matrix, while mitigation actions save as separate child truth that exports can use later.",
    emptyState:
      "Mark a walkthrough item as 'Not ok' and transfer it to the risk register to unlock editable rows here.",
    transferredFromWalkthrough:
      "Transferred from the walkthrough. Save this row to repair or refresh the stored severity. Saved mitigation actions below remain separate child truth.",
    staleClassification:
      "Saved severity is stale. Save this entry to repair it.",
    invalidClassification:
      "Saved severity could not be verified. Save this entry to repair it.",
    labels: {
      criterion: "Criterion",
      hazard: "Hazard",
      healthEffects: "Possible health effects",
      whoAtRisk: "Who is at risk",
      currentControls: "Current controls",
      proposedAction: "Next action",
      classification: "Severity choice",
      likelihood: "Likelihood",
      consequence: "Consequence",
      classificationReasoning: "Classification reasoning",
      costEstimate: "Cost estimate",
      responsibleOwner: "Responsible owner",
      dueDate: "Planned date",
      completedAt: "Completed on",
      savedLevel: "Severity",
      mitigationDescription: "Description",
      mitigationAssignee: "Assignee",
      mitigationDueDate: "Due date",
      mitigationStatus: "Status",
    },
    placeholders: {
      hazard: "Describe the hazard...",
      healthEffects: "Possible injury or health outcome...",
      whoAtRisk: "People or roles affected...",
      classificationReasoning: "Why does this classification fit the current conditions?",
      currentControls: "What is already in place?",
      proposedAction: "What should change next?",
      costEstimate: "0",
      responsibleOwner: "Who owns this next step?",
      mitigationDescription: "Describe the mitigation action...",
      mitigationAssignee: "Who owns this action?",
    },
    classificationDescription:
      "Choose a named severity and then the exact likelihood and consequence pair inside it. The server saves the exact values and derives the stored severity from the pinned matrix.",
    clear: "Clear",
    savePills: {
      saving: "Saving...",
      error: "Save issue",
      unsaved: "Unsaved",
      saved: "Saved",
    },
    saveButton: "Save risk entry",
    saveButtonSaving: "Saving risk entry...",
    riskLevel: {
      needsRepair: "Needs repair",
      incomplete: "Incomplete",
      saveToRefresh: "Save to refresh",
    },
    workflowRules: {
      justificationRequired:
        "This template requires saved classification reasoning for this entry before the risk register and export count as ready.",
      mitigationRequired:
        "This template requires at least one saved mitigation action for this severity before the risk register and export count as ready.",
    },
    mitigation: {
      heading: "Mitigation actions",
      description:
        "Saved actions belong to this risk entry. Local drafts stay client-side until you save them, and only saved actions appear in exports.",
      addAction: "Add action",
      emptyState:
        "No saved mitigation actions yet. Add a draft here when this risk entry needs a concrete next step.",
      cardHelper:
        "Keep each action concrete so it can render truthfully in later exports.",
      removeDraft: "Remove draft",
      deleteAction: "Delete action",
      deletingAction: "Deleting action...",
      createAction: "Create action",
      creatingAction: "Creating action...",
      saveAction: "Save action",
      savingAction: "Saving action...",
      savingExisting: "Saving...",
      creating: "Creating...",
      deleting: "Deleting...",
      issue: "Issue",
      draft: "Draft",
      descriptionRequired:
        "Description is required before this mitigation action can be saved.",
      fallbacks: {
        save: "We could not save this mitigation action.",
        delete: "We could not delete this mitigation action.",
      },
      statuses: {
        open: "Open",
        inProgress: "In progress",
        done: "Done",
      },
    },
    fallbacks: {
      save: "We could not save this risk entry.",
    },
  },
} as const;

const SUMMARY_COPY = {
  is: {
    eyebrow: "Skref 6",
    heading: "Samantekt og útflutningsstaða",
    description:
      "Skráðu loka-samhengi matsins hér og notaðu stöðupanelinn til að staðfesta að yfirferð, flutningur, flokkun og samantekt hafi öll verið vistuð fyrir S1-08.",
    readinessBadge: {
      ready: "Útflutningsstaða tilbúin",
      blocked: "Útflutningur lokaður",
    },
    fieldLabels: {
      companyName: "Heiti vinnustaðar",
      location: "Staðsetning",
      assessmentDate: "Dagsetning mats",
      participants: "Þátttakendur",
      method: "Aðferð",
      notes: "Samantekt",
    },
    descriptions: {
      companyName: "Sjálfgefið út frá núverandi vinnustað þar til þú vistar gildið.",
      location: "Sjálfgefið úr heimilisfangi vinnustaðarins ef það er tiltækt.",
      assessmentDate:
        "Byrjunardagsetning matsins er tillaga þar til þú vistar loka-samantektina.",
      participants: "Skráðu hverjir tóku þátt í matinu.",
      method: "Lýstu aðferðinni sem notuð var við matið.",
      notes: "Skráðu forgangsraðaða samantekt fyrir loka-afhendingu.",
    },
    placeholders: {
      companyName: "Heiti fyrirtækis eða vinnustaðar",
      location: "Staðsetning vinnustaðar",
      participants: "Matsaðilar, starfsfólk, nemendur eða gestir",
      method: "Yfirferð, athugunaraðferð eða umfang...",
      notes:
        "Taktu saman hæstu áhættur, heildarmyndina og mikilvægustu næstu skrefin...",
    },
    readiness: {
      eyebrow: "Staða",
      heading: "Útflutningshlið",
      description:
        "Sjálfgefin vinnustaðargildi hjálpa til að hefja skráðar fljótt, en telja fyrst til útflutningsstöðu eftir að þú hefur vistað þau í þessu skrefi.",
      labels: {
        walkthrough: "Yfirferð",
        transfer: "Flutningur",
        classification: "Flokkun",
        summary: "Samantekt",
      },
      ready: "Tilbúið",
      allReady:
        "Allar vistaðar forsendur eru tilbúnar. S1-08 getur notað þetta mat án endurvinnslu á samantekt eða stöðusniðinu.",
    },
    priority: {
      eyebrow: "Forgangsviðmið",
      heading: "Áhættufærslur eftir alvarleika",
      description:
        "Notaðu raðaða áhættuskrána sem viðmið meðan þú skrifar loka-samantektina.",
      criterionLabel: "Atriði",
      empty:
        "Engar færðar áhættufærslur eru tiltækar enn. Færa þarf vistuð 'Ekki í lagi' atriði áður en útflutningsstaða getur orðið tilbúin.",
      stale: "Úrelt",
      repair: "Laga",
      needsScoring: "Vantar stig",
    },
    saveButton: "Vista samantekt",
    saveButtonSaving: "Vista samantekt...",
    exportButton: "Sækja Word + PDF pakka",
    exportButtonSaving: "Bý til Word + PDF pakka...",
    fallbacks: {
      save: "Ekki tókst að vista samantektina.",
      export: "Ekki tókst að búa til útflutningspakkann.",
      exportDownloaded: "Pakkinn var sóttur.",
    },
  },
  en: {
    eyebrow: "Step 6",
    heading: "Summary and export readiness",
    description:
      "Capture the final assessment context here, then use the readiness panel to confirm the walkthrough, transfer, classification, and summary prerequisites are fully persisted for S1-08.",
    readinessBadge: {
      ready: "Export-ready state reached",
      blocked: "Export readiness blocked",
    },
    fieldLabels: {
      companyName: "Company name",
      location: "Location",
      assessmentDate: "Assessment date",
      participants: "Participants",
      method: "Method",
      notes: "Summary notes",
    },
    descriptions: {
      companyName: "Prefilled from the current workplace until you save it.",
      location: "Defaults from the workplace address when available.",
      assessmentDate:
        "Started date is suggested until you persist the final summary.",
      participants: "List who took part in the assessment.",
      method: "Describe the method used to complete the assessment.",
      notes: "Write the prioritised step-6 synthesis for the final deliverable.",
    },
    placeholders: {
      companyName: "Company or workplace name",
      location: "Workplace location",
      participants: "Assessors, staff, students, or visitors",
      method: "Walkthrough, observation method, or scope...",
      notes:
        "Summarize the highest-priority risks, the overall picture, and the most important next actions...",
    },
    readiness: {
      eyebrow: "Readiness",
      heading: "Export gate",
      description:
        "Prefilled workplace details help you start fast, but they only count toward export readiness after you save them on this step.",
      labels: {
        walkthrough: "Walkthrough",
        transfer: "Transfer",
        classification: "Classification",
        summary: "Summary",
      },
      ready: "Ready",
      allReady:
        "All persisted prerequisites are ready. S1-08 can consume this assessment without reworking the summary or readiness shape.",
    },
    priority: {
      eyebrow: "Priority reference",
      heading: "Risk entries by severity",
      description:
        "Use the sorted risk register as a reference while writing the final summary.",
      criterionLabel: "Criterion",
      empty:
        "No transferred risk entries are available yet. Any persisted 'Not ok' findings still need transfer before export readiness can pass.",
      stale: "Stale",
      repair: "Repair",
      needsScoring: "Needs scoring",
    },
    saveButton: "Save summary",
    saveButtonSaving: "Saving summary...",
    exportButton: "Download Word + PDF bundle",
    exportButtonSaving: "Building Word + PDF bundle...",
    fallbacks: {
      save: "We could not save this summary.",
      export: "We could not generate the export bundle.",
      exportDownloaded: "Export bundle downloaded.",
    },
  },
} as const;

export function getStartAssessmentPageCopy(language: AppLanguage) {
  return START_PAGE_COPY[language];
}

export function getAssessmentWalkthroughStaticCopy(language: AppLanguage) {
  return WALKTHROUGH_COPY[language];
}

export function getRiskRegisterStaticCopy(language: AppLanguage) {
  return RISK_REGISTER_COPY[language];
}

export function getAssessmentSummaryStaticCopy(language: AppLanguage) {
  return SUMMARY_COPY[language];
}

export function getAssessmentProgressionStepLabel(
  language: AppLanguage,
  stepId: AssessmentProgressionStepId,
): string {
  if (language === "is") {
    switch (stepId) {
      case "walkthrough":
        return "Yfirferð";
      case "riskRegister":
        return "Áhættuskrá";
      case "summary":
        return "Samantekt";
      case "export":
        return "Útflutningur";
    }
  }

  switch (stepId) {
    case "walkthrough":
      return "Walkthrough";
    case "riskRegister":
      return "Risk register";
    case "summary":
      return "Summary";
    case "export":
      return "Export";
  }
}

export function getAssessmentProgressionStatusLabel(params: {
  readonly language: AppLanguage;
  readonly step: AssessmentProgressionStepStatus;
  readonly currentStepId: AssessmentProgressionStepId;
}): string {
  if (params.currentStepId === params.step.id) {
    return params.language === "is" ? "Næsta skref" : "Current step";
  }

  if (params.step.availability === "blocked") {
    return params.language === "is" ? "Lokað" : "Blocked";
  }

  return getAssessmentProgressionCompletionLabel(
    params.language,
    params.step.completionState,
  );
}

export function getAssessmentProgressionMetricLabel(params: {
  readonly language: AppLanguage;
  readonly step: AssessmentProgressionStepStatus;
}): string {
  const { language, step } = params;

  switch (step.id) {
    case "walkthrough":
      return getProgressCountLabel(language, {
        answeredCriteria: step.answeredCriterionCount,
        totalCriteria: step.totalCriterionCount,
      });
    case "riskRegister":
      if (step.requiredEntryCount === 0) {
        return language === "is"
          ? "Engin vistuð áhættuskrárvinna krafist"
          : "No persisted register work required";
      }

      return language === "is"
        ? `${step.metrics.completedCount} af ${step.metrics.totalCount} lokið`
        : `${step.metrics.completedCount} of ${step.metrics.totalCount} complete`;
    case "summary":
      return language === "is"
        ? `${step.savedFieldCount} af ${step.requiredFieldCount} vistuðum reitum lokið`
        : `${step.savedFieldCount} of ${step.requiredFieldCount} saved fields complete`;
    case "export":
      return step.exportReady
        ? language === "is"
          ? "Tilbúið til útflutnings"
          : "Ready for export"
        : language === "is"
          ? "Útflutningur óopnaður"
          : "Export still locked";
  }
}

export function getAssessmentProgressionGuidanceMessage(params: {
  readonly language: AppLanguage;
  readonly step: AssessmentProgressionStepStatus;
  readonly currentStepId: AssessmentProgressionStepId;
}): string {
  if (params.step.availability === "blocked" && params.step.blockedByStepId) {
    const blockedByLabel = getAssessmentProgressionStepLabel(
      params.language,
      params.step.blockedByStepId,
    );

    return params.language === "is"
      ? `Ljúktu fyrst við ${blockedByLabel.toLowerCase()} til að gera þetta að næsta leiðbeinda skrefi. Vistað efni helst sýnilegt á meðan.`
      : `Complete ${blockedByLabel.toLowerCase()} first to make this the next guided step. Saved data stays visible while blocked.`;
  }

  if (params.currentStepId === params.step.id) {
    return params.language === "is"
      ? "Þetta er næsta leiðbeinda skrefið samkvæmt vistaðri stöðu matsins."
      : "This is the next guided step from the persisted assessment state.";
  }

  if (params.step.completionState === "complete") {
    return params.language === "is"
      ? "Vistaðar forsendur þessa skrefs eru lokið og halda sér sýnilegar hér fyrir neðan."
      : "The persisted requirements for this step are complete and stay visible below.";
  }

  return params.language === "is"
    ? "Vistaðar hindranir og framvinda þessa skrefs haldast hér samstillt."
    : "The persisted blockers and progress for this step stay aligned here.";
}

export function getAssessmentProgressionBlockerMessages(
  language: AppLanguage,
  blockers: readonly AssessmentProgressionBlocker[],
): string[] {
  return blockers.map((blocker) =>
    getAssessmentProgressionBlockerMessage(language, blocker),
  );
}

export function getAssessmentProgressionCompletionLabel(
  language: AppLanguage,
  completionState: AssessmentProgressionCompletionState,
): string {
  if (language === "is") {
    switch (completionState) {
      case "notStarted":
        return "Ekki hafið";
      case "inProgress":
        return "Í vinnslu";
      case "complete":
        return "Lokið";
    }
  }

  switch (completionState) {
    case "notStarted":
      return "Not started";
    case "inProgress":
      return "In progress";
    case "complete":
      return "Complete";
  }
}

export function getAnswerOptions(language: AppLanguage) {
  return ANSWER_OPTION_COPY[language];
}

export function getTemplateMetaLabel(
  language: AppLanguage,
  params: {
    readonly sections: number;
    readonly criteria: number;
  },
): string {
  return language === "is"
    ? `${params.sections} kaflar · ${params.criteria} atriði`
    : `${params.sections} sections · ${params.criteria} criteria`;
}

export function getProgressCountLabel(
  language: AppLanguage,
  params: {
    readonly answeredCriteria: number;
    readonly totalCriteria: number;
  },
): string {
  return language === "is"
    ? `${params.answeredCriteria} af ${params.totalCriteria} atriðum svarað`
    : `${params.answeredCriteria} of ${params.totalCriteria} criteria answered`;
}

export function getCompletedSectionsLabel(
  language: AppLanguage,
  params: {
    readonly completedSections: number;
    readonly totalSections: number;
  },
): string {
  return language === "is"
    ? `${params.completedSections}/${params.totalSections} loknir`
    : `${params.completedSections}/${params.totalSections}`;
}

export function getSectionAnsweredCountLabel(
  language: AppLanguage,
  params: {
    readonly answeredCount: number;
    readonly totalCount: number;
  },
): string {
  return language === "is"
    ? `${params.answeredCount} af ${params.totalCount} svarað`
    : `${params.answeredCount} of ${params.totalCount} answered`;
}

export function getCriterionAnswerAriaLabel(
  language: AppLanguage,
  criterionNumber: string,
): string {
  return language === "is"
    ? `Svara atriði ${criterionNumber}`
    : `Answer criterion ${criterionNumber}`;
}

export function getTransferMetricValueLabel(count: number): string {
  return String(count);
}

export function getCriterionSaveMessage(params: {
  readonly language: AppLanguage;
  readonly saveState: "idle" | "saving" | "error";
  readonly draftStatus: string;
  readonly draftNotesLength: number;
  readonly dirty: boolean;
  readonly lastSavedAt: string | null;
  readonly savedStatus: string;
  readonly savedNotesLength: number;
  readonly errorMessage: string | null;
}): string {
  const copy = getAssessmentWalkthroughStaticCopy(params.language);

  if (params.saveState === "saving") {
    return params.language === "is"
      ? "Vista þetta atriði..."
      : "Saving this criterion...";
  }

  if (params.saveState === "error") {
    return params.errorMessage ?? copy.fallbacks.criterionSave;
  }

  if (params.draftStatus === "unanswered" && params.draftNotesLength > 0) {
    return params.language === "is"
      ? "Veldu svar áður en þú vistar þetta atriði."
      : "Select an answer before you save this item.";
  }

  if (params.dirty) {
    return params.language === "is"
      ? "Tilbúið að vista breytingarnar á þessu atriði."
      : "This item is ready to save.";
  }

  if (params.lastSavedAt) {
    return params.language === "is"
      ? `Vistað ${formatSavedAt(params.language, params.lastSavedAt)}. Þú getur breytt aftur hvenær sem er.`
      : `Saved ${formatSavedAt(params.language, params.lastSavedAt)}. You can edit it again anytime.`;
  }

  if (params.savedStatus === "unanswered" && params.savedNotesLength === 0) {
    return params.language === "is"
      ? "Veldu svar og vistaðu atriðið þegar þú ert tilbúin."
      : "Choose an answer and save the item when you are ready.";
  }

  return params.language === "is"
    ? "Vistað. Þú getur breytt atriðinu aftur hvenær sem er."
    : "Saved. You can reopen and edit the item anytime.";
}

export function getTransferMessage(params: {
  readonly language: AppLanguage;
  readonly status: "idle" | "transferring" | "success" | "error";
  readonly message: string | null;
  readonly eligibleTransferCriteria: number;
  readonly remainingCriteria: number;
}): string {
  if (params.status === "transferring") {
    return params.language === "is"
      ? "Flyt hæf atriði í áhættuskrána..."
      : "Transferring eligible findings into the risk register...";
  }

  if (params.message) {
    return params.message;
  }

  if (params.eligibleTransferCriteria === 0) {
    return params.language === "is"
      ? "Merktu atriði sem 'Ekki í lagi' til að gera það hæft til flutnings."
      : "Mark a criterion as 'Not ok' to make it eligible for transfer.";
  }

  if (params.remainingCriteria === 0) {
    return params.language === "is"
      ? "Öll vistuð 'Ekki í lagi' atriði eru þegar í áhættuskránni."
      : "All persisted 'Not ok' findings are already in the risk register.";
  }

  return params.language === "is"
    ? "Flutningur bætir bara við vistuðum 'Ekki í lagi' atriðum sem vantar enn."
    : "Transfer will add only the persisted 'Not ok' findings that are still missing.";
}

export function getTransferButtonLabel(params: {
  readonly language: AppLanguage;
  readonly status: "idle" | "transferring" | "success" | "error";
  readonly remainingCriteria: number;
}): string {
  if (params.status === "transferring") {
    return params.language === "is" ? "Flyt..." : "Transferring...";
  }

  if (params.remainingCriteria === 0) {
    return params.language === "is"
      ? "Öll hæf atriði færð"
      : "All eligible findings transferred";
  }

  return params.language === "is"
    ? `Færa ${params.remainingCriteria} ${pluralize(params.remainingCriteria, "niðurstöðu", "niðurstöður")}`
    : `Transfer ${params.remainingCriteria} ${pluralize(params.remainingCriteria, "finding", "findings")}`;
}

export function buildTransferSuccessMessage(params: {
  readonly language: AppLanguage;
  readonly createdRiskEntryCount: number;
  readonly existingRiskEntryCount: number;
}): string {
  if (params.createdRiskEntryCount === 0 && params.existingRiskEntryCount > 0) {
    return params.language === "is"
      ? `Öll ${params.existingRiskEntryCount} hæf ${pluralize(params.existingRiskEntryCount, "niðurstaða var", "niðurstöður voru")} þegar í áhættuskránni.`
      : `All ${params.existingRiskEntryCount} eligible ${pluralize(params.existingRiskEntryCount, "finding was", "findings were")} already in the risk register.`;
  }

  if (params.existingRiskEntryCount === 0) {
    return params.language === "is"
      ? `Færði ${params.createdRiskEntryCount} ${pluralize(params.createdRiskEntryCount, "niðurstöðu", "niðurstöður")} í áhættuskrána.`
      : `Transferred ${params.createdRiskEntryCount} ${pluralize(params.createdRiskEntryCount, "finding", "findings")} into the risk register.`;
  }

  return params.language === "is"
    ? `Færði ${params.createdRiskEntryCount} ${pluralize(params.createdRiskEntryCount, "niðurstöðu", "niðurstöður")} og hélt ${params.existingRiskEntryCount} ${pluralize(params.existingRiskEntryCount, "fyrri færslu", "fyrri færslum")} á sínum stað.`
    : `Transferred ${params.createdRiskEntryCount} ${pluralize(params.createdRiskEntryCount, "finding", "findings")} and kept ${params.existingRiskEntryCount} existing ${pluralize(params.existingRiskEntryCount, "entry", "entries")} in place.`;
}

export function getTransferredEntryCountLabel(
  language: AppLanguage,
  count: number,
): string {
  return language === "is"
    ? `${count} ${pluralize(count, "færð færsla", "færðar færslur")}`
    : `${count} transferred ${pluralize(count, "entry", "entries")}`;
}

export function getRiskLevelLabel(
  language: AppLanguage,
  riskLevel: RiskLevel,
): string {
  if (language === "is") {
    switch (riskLevel) {
      case "low":
        return "Lág";
      case "medium":
        return "Miðlungs";
      case "high":
        return "Há";
    }
  }

  switch (riskLevel) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
  }
}

export function getRiskSeverityChoiceOptionLabel(params: {
  readonly language: AppLanguage;
  readonly likelihood: number;
  readonly consequence: number;
}): string {
  const copy = getRiskRegisterStaticCopy(params.language);

  if (params.language === "is") {
    return `${copy.labels.likelihood} ${params.likelihood} · ${copy.labels.consequence} ${params.consequence}`;
  }

  return `${copy.labels.likelihood} ${params.likelihood} · ${copy.labels.consequence} ${params.consequence}`;
}

export function getRiskRegisterClassificationMessage(params: {
  readonly language: AppLanguage;
  readonly state: "ready" | "staleRiskLevel" | "invalidClassification";
}): string | null {
  const copy = getRiskRegisterStaticCopy(params.language);

  switch (params.state) {
    case "ready":
      return null;
    case "staleRiskLevel":
      return copy.staleClassification;
    case "invalidClassification":
      return copy.invalidClassification;
  }
}

export function getRiskEntrySaveMessage(params: {
  readonly language: AppLanguage;
  readonly saveState: "idle" | "saving" | "error";
  readonly dirty: boolean;
  readonly canPersist: boolean;
  readonly savedRiskLevel: RiskLevel | null;
  readonly classificationState: "ready" | "staleRiskLevel" | "invalidClassification";
  readonly errorMessage: string | null;
}): string {
  const copy = getRiskRegisterStaticCopy(params.language);

  if (params.saveState === "saving") {
    return params.language === "is"
      ? "Vista þessa áhættufærslu..."
      : "Saving this risk entry...";
  }

  if (params.saveState === "error") {
    return params.errorMessage ?? copy.fallbacks.save;
  }

  if (!params.canPersist) {
    return params.language === "is"
      ? "Hætta er nauðsynleg áður en hægt er að vista þessa færslu."
      : "Hazard is required before this row can be saved.";
  }

  if (params.dirty) {
    return params.language === "is"
      ? "Breytingar bíða vistunar. Vistaður alvarleiki uppfærist eftir vistun."
      : "Changes pending save. The stored severity updates after save.";
  }

  if (params.classificationState !== "ready") {
    return (
      getRiskRegisterClassificationMessage({
        language: params.language,
        state: params.classificationState,
      }) ?? copy.invalidClassification
    );
  }

  if (params.savedRiskLevel) {
    const riskLevelLabel = getRiskLevelLabel(params.language, params.savedRiskLevel);
    return params.language === "is"
      ? `Vistaður alvarleiki: ${riskLevelLabel}.`
      : `Saved severity: ${riskLevelLabel}.`;
  }

  return params.language === "is"
    ? "Drög vistuð. Veldu nákvæma samsetningu til að fá vistaðan alvarleika."
    : "Saved draft. Choose an exact combination to derive the stored severity.";
}

export function getRiskMitigationActionStatusLabel(
  language: AppLanguage,
  status: RiskMitigationActionStatus,
): string {
  return getRiskRegisterStaticCopy(language).mitigation.statuses[status];
}

export function getRiskMitigationActionCardEyebrow(params: {
  readonly language: AppLanguage;
  readonly persisted: boolean;
  readonly index: number;
}): string {
  const ordinal = params.index + 1;

  if (params.language === "is") {
    return params.persisted
      ? `Aðgerð ${ordinal} · vistuð`
      : `Aðgerð ${ordinal} · drög`;
  }

  return params.persisted
    ? `Saved action ${ordinal}`
    : `Draft action ${ordinal}`;
}

export function getRiskMitigationActionStatePillLabel(params: {
  readonly language: AppLanguage;
  readonly persisted: boolean;
  readonly dirty: boolean;
  readonly saveState: "idle" | "saving" | "deleting" | "error";
}): string {
  const copy = getRiskRegisterStaticCopy(params.language).mitigation;

  if (params.saveState === "saving") {
    return params.persisted ? copy.savingExisting : copy.creating;
  }

  if (params.saveState === "deleting") {
    return copy.deleting;
  }

  if (params.saveState === "error") {
    return copy.issue;
  }

  if (params.dirty) {
    return params.persisted ? getRiskRegisterStaticCopy(params.language).savePills.unsaved : copy.draft;
  }

  return params.persisted
    ? getRiskRegisterStaticCopy(params.language).savePills.saved
    : copy.draft;
}

export function getRiskMitigationActionMessage(params: {
  readonly language: AppLanguage;
  readonly persisted: boolean;
  readonly dirty: boolean;
  readonly canPersist: boolean;
  readonly saveState: "idle" | "saving" | "deleting" | "error";
  readonly status: RiskMitigationActionStatus;
  readonly errorMessage: string | null;
}): string {
  const copy = getRiskRegisterStaticCopy(params.language).mitigation;

  if (params.saveState === "saving") {
    return params.persisted
      ? params.language === "is"
        ? "Vista þessa mótvægisaðgerð..."
        : "Saving this mitigation action..."
      : params.language === "is"
        ? "Bý til þessa mótvægisaðgerð..."
        : "Creating this mitigation action...";
  }

  if (params.saveState === "deleting") {
    return params.language === "is"
      ? "Eyði þessari mótvægisaðgerð..."
      : "Deleting this mitigation action...";
  }

  if (params.saveState === "error") {
    return params.errorMessage ?? copy.fallbacks.save;
  }

  if (!params.canPersist) {
    return copy.descriptionRequired;
  }

  if (params.dirty) {
    return params.persisted
      ? params.language === "is"
        ? "Breytingar bíða vistunar. Útflutningur notar aðeins síðast vistað gildi aðgerðarinnar."
        : "Changes pending save. Export uses the last saved action values only."
      : params.language === "is"
        ? "Þessi drög haldast staðbundin þar til þú býrð til aðgerðina."
        : "This draft stays local until you create the mitigation action.";
  }

  return params.persisted
    ? params.language === "is"
      ? `Vistuð staða aðgerðar: ${getRiskMitigationActionStatusLabel(params.language, params.status)}.`
      : `Saved action status: ${getRiskMitigationActionStatusLabel(params.language, params.status)}.`
    : params.language === "is"
      ? "Drög tilbúin. Búðu til aðgerðina til að vista hana."
      : "Draft ready. Create the mitigation action to persist it.";
}

export function getRiskMitigationActionDeleteButtonLabel(params: {
  readonly language: AppLanguage;
  readonly persisted: boolean;
  readonly saveState: "idle" | "saving" | "deleting" | "error";
}): string {
  const copy = getRiskRegisterStaticCopy(params.language).mitigation;

  if (!params.persisted) {
    return copy.removeDraft;
  }

  return params.saveState === "deleting"
    ? copy.deletingAction
    : copy.deleteAction;
}

export function getRiskMitigationActionSaveButtonLabel(params: {
  readonly language: AppLanguage;
  readonly persisted: boolean;
  readonly saveState: "idle" | "saving" | "deleting" | "error";
}): string {
  const copy = getRiskRegisterStaticCopy(params.language).mitigation;

  if (params.saveState === "saving") {
    return params.persisted ? copy.savingAction : copy.creatingAction;
  }

  return params.persisted ? copy.saveAction : copy.createAction;
}

export function getReadinessCountLabel(
  language: AppLanguage,
  params: {
    readonly ready: boolean;
    readonly count: number;
  },
): string {
  if (params.ready) {
    return getAssessmentSummaryStaticCopy(language).readiness.ready;
  }

  return language === "is"
    ? `Ólokið: ${params.count}`
    : `${params.count} open`;
}

export function getReadinessBlockers(
  language: AppLanguage,
  readiness: {
    readonly walkthrough: {
      readonly ready: boolean;
      readonly unansweredCriterionCount: number;
    };
    readonly transfer: {
      readonly ready: boolean;
      readonly missingRiskEntryCount: number;
    };
    readonly classification: {
      readonly unclassifiedRiskEntryCount: number;
      readonly staleRiskEntryCount: number;
      readonly invalidRiskEntryCount: number;
    };
    readonly summary: {
      readonly ready: boolean;
      readonly missingFields: readonly AssessmentSummaryRequiredField[];
    };
  },
): string[] {
  return getAssessmentProgressionBlockerMessages(language, [
    ...(readiness.walkthrough.unansweredCriterionCount > 0
      ? [
          {
            code: "walkthroughUnansweredCriteria" as const,
            count: readiness.walkthrough.unansweredCriterionCount,
          },
        ]
      : []),
    ...(readiness.transfer.missingRiskEntryCount > 0
      ? [
          {
            code: "riskRegisterMissingTransfers" as const,
            count: readiness.transfer.missingRiskEntryCount,
          },
        ]
      : []),
    ...(readiness.classification.unclassifiedRiskEntryCount > 0
      ? [
          {
            code: "riskRegisterUnclassifiedEntries" as const,
            count: readiness.classification.unclassifiedRiskEntryCount,
          },
        ]
      : []),
    ...(readiness.classification.staleRiskEntryCount > 0
      ? [
          {
            code: "riskRegisterStaleEntries" as const,
            count: readiness.classification.staleRiskEntryCount,
          },
        ]
      : []),
    ...(readiness.classification.invalidRiskEntryCount > 0
      ? [
          {
            code: "riskRegisterInvalidEntries" as const,
            count: readiness.classification.invalidRiskEntryCount,
          },
        ]
      : []),
    ...(readiness.summary.missingFields.length > 0
      ? [
          {
            code: "summaryMissingFields" as const,
            count: readiness.summary.missingFields.length,
            fieldIds: readiness.summary.missingFields,
          },
        ]
      : []),
  ]);
}

export function getPriorityBadgeLabel(params: {
  readonly language: AppLanguage;
  readonly classificationState: "ready" | "staleRiskLevel" | "invalidClassification";
  readonly savedRiskLevel: RiskLevel | null;
}): string {
  const copy = getAssessmentSummaryStaticCopy(params.language);

  if (params.classificationState === "staleRiskLevel") {
    return copy.priority.stale;
  }

  if (params.classificationState === "invalidClassification") {
    return copy.priority.repair;
  }

  if (params.savedRiskLevel == null) {
    return copy.priority.needsScoring;
  }

  return getRiskLevelLabel(params.language, params.savedRiskLevel);
}

export function getSummarySaveMessage(params: {
  readonly language: AppLanguage;
  readonly saveState: "idle" | "saving" | "error";
  readonly dirty: boolean;
  readonly exportReady: boolean;
  readonly errorMessage: string | null;
}): string {
  const copy = getAssessmentSummaryStaticCopy(params.language);

  if (params.saveState === "saving") {
    return params.language === "is"
      ? "Vista samantektina og endurreikna útflutningsstöðuna..."
      : "Saving the persisted summary and recomputing export readiness...";
  }

  if (params.saveState === "error") {
    return params.errorMessage ?? copy.fallbacks.save;
  }

  if (params.dirty) {
    return params.language === "is"
      ? "Breytingar bíða vistunar. Útflutningsstaða uppfærist eftir að þjónninn staðfestir samantektina."
      : "Changes pending save. Export readiness updates after the server confirms this summary.";
  }

  return params.exportReady
    ? params.language === "is"
      ? "Samantekt vistuð. Matið er tilbúið fyrir síðari útflutningssögu."
      : "Summary saved. This assessment is ready for the later export story."
    : params.language === "is"
      ? "Samantekt vistuð. Eftirstöðvar hindranir eru taldar upp í stöðupanelnum."
      : "Summary saved. Remaining blockers are listed in the readiness panel.";
}

export function getExportMessage(params: {
  readonly language: AppLanguage;
  readonly exportReady: boolean;
  readonly summaryDirty: boolean;
  readonly exportState: {
    readonly status: "idle" | "exporting" | "error" | "success";
    readonly message: string | null;
  };
}): string {
  const copy = getAssessmentSummaryStaticCopy(params.language);

  if (params.exportState.status === "exporting") {
    return params.language === "is"
      ? "Bý til Word og PDF skjöl úr vistaðri stöðu matsins..."
      : "Generating Word and PDF files from the persisted assessment state...";
  }

  if (params.exportState.status === "error") {
    return params.exportState.message ?? copy.fallbacks.export;
  }

  if (params.exportState.status === "success") {
    return params.exportState.message ?? copy.fallbacks.exportDownloaded;
  }

  if (!params.exportReady) {
    return params.language === "is"
      ? "Ljúktu fyrst við hindranirnar hér að ofan áður en útflutningur opnast."
      : "Finish the readiness blockers above before export unlocks.";
  }

  if (params.summaryDirty) {
    return params.language === "is"
      ? "Vistaðu breytingar á samantekt áður en þú sækir vistaðan pakka."
      : "Save summary changes before exporting the persisted bundle.";
  }

  return params.language === "is"
    ? "Útflutningur notar vistaðan gátlista, áhættuskrá og samantektargildi."
    : "Export uses the persisted checklist, risk register, and summary values.";
}

export function formatSummaryFieldList(
  language: AppLanguage,
  fields: readonly AssessmentSummaryRequiredField[],
): string {
  const labels = fields.map((field) => getSummaryFieldLabel(language, field));

  if (labels.length === 1) {
    return labels[0]!;
  }

  if (labels.length === 2) {
    return language === "is"
      ? `${labels[0]} og ${labels[1]}`
      : `${labels[0]} and ${labels[1]}`;
  }

  const delimiter = ", ";
  const conjunction = language === "is" ? "og" : "and";
  return `${labels.slice(0, -1).join(delimiter)} ${conjunction} ${labels.at(-1)}`;
}

export function getSummaryFieldLabel(
  language: AppLanguage,
  field: AssessmentSummaryRequiredField,
): string {
  if (language === "is") {
    switch (field) {
      case "companyName":
        return "heiti vinnustaðar";
      case "location":
        return "staðsetningu";
      case "assessmentDate":
        return "dagsetningu mats";
      case "participants":
        return "þátttakendur";
      case "method":
        return "aðferð";
      case "notes":
        return "samantekt";
    }
  }

  switch (field) {
    case "companyName":
      return "company name";
    case "location":
      return "location";
    case "assessmentDate":
      return "assessment date";
    case "participants":
      return "participants";
    case "method":
      return "method";
    case "notes":
      return "summary notes";
  }
}

function getAssessmentProgressionBlockerMessage(
  language: AppLanguage,
  blocker: AssessmentProgressionBlocker,
): string {
  switch (blocker.code) {
    case "walkthroughUnansweredCriteria":
      return language === "is"
        ? `Það vantar svör fyrir ${blocker.count} ${pluralize(blocker.count, "matsatriði", "matsatriði")}.`
        : `${blocker.count} ${pluralize(blocker.count, "walkthrough item still needs an answer", "walkthrough items still need answers")}.`;
    case "riskRegisterMissingTransfers":
      return language === "is"
        ? `Það á eftir að færa ${blocker.count} ${pluralize(blocker.count, "viðeigandi niðurstöðu", "viðeigandi niðurstöður")} í áhættuskrána.`
        : `${blocker.count} ${pluralize(blocker.count, "eligible finding still needs transfer", "eligible findings still need transfer")} into the risk register.`;
    case "riskRegisterUnclassifiedEntries":
      return language === "is"
        ? `Vistaða flokkun vantar fyrir ${blocker.count} ${pluralize(blocker.count, "færslu", "færslur")}.`
        : `${blocker.count} ${pluralize(blocker.count, "transferred entry still needs a saved classification", "transferred entries still need saved classifications")}.`;
    case "riskRegisterStaleEntries":
      return language === "is"
        ? `${blocker.count} ${pluralize(blocker.count, "færsla er með úrelt vistað stig", "færslur eru með úrelt vistað stig")} og þarf endurvistun.`
        : `${blocker.count} ${pluralize(blocker.count, "risk entry has a stale saved level", "risk entries have stale saved levels")} and need re-saving.`;
    case "riskRegisterInvalidEntries":
      return language === "is"
        ? `Ekki tókst að staðfesta vistaða flokkun fyrir ${blocker.count} ${pluralize(blocker.count, "færslu", "færslur")}.`
        : `${blocker.count} ${pluralize(blocker.count, "risk entry could not verify its saved classification", "risk entries could not verify their saved classifications")}.`;
    case "riskRegisterMissingJustification":
      return language === "is"
        ? `Vistaða röksemd vantar fyrir ${blocker.count} ${pluralize(blocker.count, "áhættufærslu", "áhættufærslur")}.`
        : `${blocker.count} ${pluralize(blocker.count, "risk entry still needs saved classification reasoning", "risk entries still need saved classification reasoning")}.`;
    case "riskRegisterMissingMitigation":
      return language === "is"
        ? `Vistaða mótvægisaðgerð vantar fyrir ${blocker.count} ${pluralize(blocker.count, "áhættufærslu", "áhættufærslur")}.`
        : `${blocker.count} ${pluralize(blocker.count, "risk entry still needs a saved mitigation action", "risk entries still need saved mitigation actions")}.`;
    case "summaryMissingFields":
      return language === "is"
        ? `Samantekt vantar enn vistuð gildi fyrir ${formatSummaryFieldList(language, blocker.fieldIds ?? [])}.`
        : `Summary is still missing saved values for ${formatSummaryFieldList(language, blocker.fieldIds ?? [])}.`;
  }
}

export function buildLocalizedDownloadMessage(
  language: AppLanguage,
  fileName: string,
): string {
  return language === "is"
    ? `Sækti ${fileName}.`
    : `Downloaded ${fileName}.`;
}

function formatSavedAt(language: AppLanguage, value: string): string {
  return new Intl.DateTimeFormat(getRequestLocale(language), {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  return count === 1 ? singular : plural;
}
