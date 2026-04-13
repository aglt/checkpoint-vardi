// @vardi/checklists — Package-owned runtime seam for seeded checklist, legal,
// and risk-matrix catalog data. Seed asset files remain internal details.
import { createDefaultSeedRuntime } from "./internal/runtime-builder.js";

export interface SeedChecklistSummary {
  readonly id: string;
  readonly slug: string;
  readonly version: string;
  readonly defaultLanguage: string;
  readonly workflowRules: SeedChecklistWorkflowRules;
  readonly sections: number;
  readonly criteria: number;
  readonly translations: {
    readonly is: {
      readonly title: string;
    };
  };
}

export interface SeedChecklist {
  readonly id: string;
  readonly slug: string;
  readonly version: string;
  readonly defaultLanguage: string;
  readonly workflowRules: SeedChecklistWorkflowRules;
  readonly translations: {
    readonly is: {
      readonly title: string;
    };
  };
  readonly sections: readonly {
    readonly id: string;
    readonly order: number;
    readonly translations: {
      readonly is: {
        readonly title: string;
      };
    };
    readonly criteria: readonly {
      readonly id: string;
      readonly number: string;
      readonly order: number;
      readonly legalRefs: readonly string[];
      readonly translations: {
        readonly is: {
          readonly title: string;
          readonly guidance: string;
        };
      };
    }[];
  }[];
}

export type SeedChecklistSummaryRequiredField =
  | "companyName"
  | "location"
  | "assessmentDate"
  | "participants"
  | "method"
  | "notes";

export interface SeedChecklistWorkflowRules {
  readonly requiresJustification: boolean;
  readonly requiresMitigationForRiskLevels: readonly RiskLevel[];
  readonly summaryRequiredFields: readonly SeedChecklistSummaryRequiredField[];
}

export interface CanonicalLegalReference {
  readonly id: string;
  readonly code: string;
  readonly url: string | null;
  readonly translations: {
    readonly is: {
      readonly title: string;
    };
  };
  readonly resolutionStatus: "canonical_resolved";
}

export interface UnresolvedImportedLegalReference {
  readonly id: string;
  readonly code: string;
  readonly url: string | null;
  readonly translations: {
    readonly is: {
      readonly title: string;
    };
  };
  readonly resolutionStatus: "unresolved_imported_code";
  readonly metadata: {
    readonly source: "derived-from-checklist-usage";
    readonly displayMode: "code_only";
  };
}

export type LegalReference =
  | CanonicalLegalReference
  | UnresolvedImportedLegalReference;

export interface LegalReferenceCatalog {
  readonly canonicalReferences: readonly CanonicalLegalReference[];
  readonly unresolvedImportedReferences: readonly UnresolvedImportedLegalReference[];
  readonly allReferences: readonly LegalReference[];
}

export type RiskLevel = "low" | "medium" | "high";

export interface RiskMatrix {
  readonly id: string;
  readonly slug: string;
  readonly likelihoodLevels: number;
  readonly consequenceLevels: number;
  readonly lookup: Readonly<Record<string, RiskLevel>>;
  readonly translations: {
    readonly is: {
      readonly title: string;
    };
  };
}

const runtime = createDefaultSeedRuntime();

export function listSeedChecklists(): readonly SeedChecklistSummary[] {
  return runtime.checklistSummaries;
}

export function getSeedChecklistById(id: string): SeedChecklist | undefined {
  return runtime.checklistById.get(id);
}

export function getSeedChecklistBySlug(slug: string): SeedChecklist | undefined {
  return runtime.checklistBySlug.get(slug);
}

export function getLegalReferenceCatalog(): LegalReferenceCatalog {
  return runtime.legalReferenceCatalog;
}

export function listLegalReferences(): readonly LegalReference[] {
  return runtime.legalReferenceCatalog.allReferences;
}

export function getLegalReferenceByCode(code: string): LegalReference | undefined {
  return runtime.legalReferenceByCode.get(code);
}

export function listRiskMatrices(): readonly RiskMatrix[] {
  return runtime.riskMatrices;
}

export function getRiskMatrixById(id: string): RiskMatrix | undefined {
  return runtime.riskMatrixById.get(id);
}

export function getRiskMatrixBySlug(slug: string): RiskMatrix | undefined {
  return runtime.riskMatrixBySlug.get(slug);
}
