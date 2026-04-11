import constructionSiteSource from "../assets/seeds/construction-site.json";
import legalReferencesSource from "../assets/seeds/legal_references.json";
import manifestSource from "../assets/seeds/manifest.json";
import riskMatricesSource from "../assets/seeds/risk_matrices.json";
import woodworkingWorkshopSource from "../assets/seeds/woodworking-workshop.json";

export interface SeedTranslation {
  readonly title: string;
}

export interface SeedCriterionTranslation extends SeedTranslation {
  readonly guidance: string;
}

export interface SeedTitleTranslations {
  readonly is: SeedTranslation;
}

export interface SeedCriterionTranslations {
  readonly is: SeedCriterionTranslation;
}

export interface SeedChecklistMetadata {
  readonly source: {
    readonly fileName: string | null;
    readonly url: string | null;
  };
}

export interface SeedCriterion {
  readonly id: string;
  readonly number: string;
  readonly order: number;
  readonly legalRefs: readonly string[];
  readonly translations: SeedCriterionTranslations;
}

export interface SeedSection {
  readonly id: string;
  readonly order: number;
  readonly translations: SeedTitleTranslations;
  readonly criteria: readonly SeedCriterion[];
}

export interface SeedChecklist {
  readonly id: string;
  readonly slug: string;
  readonly version: string;
  readonly defaultLanguage: string;
  readonly metadata: SeedChecklistMetadata;
  readonly translations: SeedTitleTranslations;
  readonly sections: readonly SeedSection[];
}

export interface SeedChecklistSummary {
  readonly id: string;
  readonly slug: string;
  readonly version: string;
  readonly defaultLanguage: string;
  readonly sections: number;
  readonly criteria: number;
  readonly translations: SeedTitleTranslations;
}

export interface SeedManifest {
  readonly checklists: readonly SeedChecklistSummary[];
  readonly legalReferences: {
    readonly canonicalCount: number;
    readonly unresolvedImportedCount: number;
    readonly count: number;
  };
  readonly riskMatrices: {
    readonly count: number;
  };
}

export interface CanonicalLegalReference {
  readonly id: string;
  readonly code: string;
  readonly url: string | null;
  readonly translations: SeedTitleTranslations;
  readonly resolutionStatus: "canonical_resolved";
}

export interface UnresolvedImportedLegalReference {
  readonly id: string;
  readonly code: string;
  readonly url: string | null;
  readonly translations: SeedTitleTranslations;
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
  readonly translations: SeedTitleTranslations;
}

export type RawTitleTranslations = {
  is: {
    title: unknown;
  };
};

export type RawCriterionTranslations = {
  is: {
    title: unknown;
    guidance: unknown;
  };
};

export type RawChecklist = {
  id: unknown;
  slug: unknown;
  version: unknown;
  defaultLanguage: unknown;
  metadata: {
    source: {
      fileName: unknown;
      url: unknown;
    };
  };
  translations: RawTitleTranslations;
  sections: RawSection[];
};

export type RawSection = {
  id: unknown;
  order: unknown;
  translations: RawTitleTranslations;
  criteria: RawCriterion[];
};

export type RawCriterion = {
  id: unknown;
  number: unknown;
  order: unknown;
  legalRefs: unknown[];
  translations: RawCriterionTranslations;
};

export type RawManifestChecklistEntry = {
  id: unknown;
  slug: unknown;
  file: unknown;
  version: unknown;
  defaultLanguage: unknown;
  sections: unknown;
  criteria: unknown;
};

export type RawManifest = {
  checklists: RawManifestChecklistEntry[];
  legalReferences: {
    file: unknown;
    canonicalCount: unknown;
    unresolvedImportedCount: unknown;
    count: unknown;
  };
  riskMatrices: {
    file: unknown;
    count: unknown;
  };
};

export type RawCanonicalLegalReference = {
  id: unknown;
  code: unknown;
  url: unknown;
  translations: RawTitleTranslations;
  resolutionStatus: unknown;
};

export type RawUnresolvedImportedLegalReference = RawCanonicalLegalReference & {
  metadata: {
    source: unknown;
    displayMode: unknown;
  };
};

export type RawLegalReferenceCatalog = {
  canonicalReferences: RawCanonicalLegalReference[];
  unresolvedImportedReferences: RawUnresolvedImportedLegalReference[];
};

export type RawRiskMatrix = {
  id: unknown;
  slug: unknown;
  likelihoodLevels: unknown;
  consequenceLevels: unknown;
  lookup: Record<string, unknown>;
  translations: RawTitleTranslations;
};

export type RawRiskMatrixCatalog = {
  matrices: RawRiskMatrix[];
};

export interface SeedRuntimeSourceData {
  readonly manifest: RawManifest;
  readonly checklists: readonly {
    readonly file: string;
    readonly checklist: RawChecklist;
  }[];
  readonly legalReferences: RawLegalReferenceCatalog;
  readonly riskMatrices: RawRiskMatrixCatalog;
}

export type SeedRuntime = {
  readonly manifest: SeedManifest;
  readonly checklists: readonly SeedChecklist[];
  readonly checklistById: ReadonlyMap<string, SeedChecklist>;
  readonly checklistBySlug: ReadonlyMap<string, SeedChecklist>;
  readonly legalReferenceCatalog: LegalReferenceCatalog;
  readonly legalReferenceByCode: ReadonlyMap<string, LegalReference>;
  readonly riskMatrices: readonly RiskMatrix[];
  readonly riskMatrixById: ReadonlyMap<string, RiskMatrix>;
  readonly riskMatrixBySlug: ReadonlyMap<string, RiskMatrix>;
};

const allowedRiskLevels = new Set<RiskLevel>(["low", "medium", "high"]);

const defaultSeedSourceData: SeedRuntimeSourceData = {
  manifest: manifestSource as RawManifest,
  checklists: [
    {
      file: "woodworking-workshop.json",
      checklist: woodworkingWorkshopSource as RawChecklist,
    },
    {
      file: "construction-site.json",
      checklist: constructionSiteSource as RawChecklist,
    },
  ],
  legalReferences: legalReferencesSource as RawLegalReferenceCatalog,
  riskMatrices: riskMatricesSource as RawRiskMatrixCatalog,
};

const runtime = buildSeedRuntime(defaultSeedSourceData);

export function buildSeedRuntime(sourceData: SeedRuntimeSourceData): SeedRuntime {
  const manifest = sourceData.manifest;

  ensure(Array.isArray(manifest.checklists), "Seed manifest checklists must be an array");
  ensure(
    typeof manifest.legalReferences?.file === "string" &&
      manifest.legalReferences.file.length > 0,
    "Seed manifest legalReferences.file must be a non-empty string",
  );
  ensure(
    typeof manifest.riskMatrices?.file === "string" &&
      manifest.riskMatrices.file.length > 0,
    "Seed manifest riskMatrices.file must be a non-empty string",
  );
  ensure(
    manifest.legalReferences.file === "legal_references.json",
    `Seed manifest legalReferences.file must stay private and canonical (received ${String(manifest.legalReferences.file)})`,
  );
  ensure(
    manifest.riskMatrices.file === "risk_matrices.json",
    `Seed manifest riskMatrices.file must stay private and canonical (received ${String(manifest.riskMatrices.file)})`,
  );

  const importedChecklistByFile = new Map<string, RawChecklist>();
  for (const entry of sourceData.checklists) {
    ensure(
      typeof entry.file === "string" && entry.file.length > 0,
      "Seed runtime source checklist file must be a non-empty string",
    );
    ensure(
      !importedChecklistByFile.has(entry.file),
      `Seed runtime source duplicate checklist file: ${entry.file}`,
    );
    importedChecklistByFile.set(entry.file, entry.checklist);
  }

  const seenManifestChecklistIds = new Set<string>();
  const seenManifestChecklistSlugs = new Set<string>();
  const seenManifestChecklistFiles = new Set<string>();
  const builtChecklistSummaries: SeedChecklistSummary[] = [];
  const builtChecklists: SeedChecklist[] = [];
  const checklistById = new Map<string, SeedChecklist>();
  const checklistBySlug = new Map<string, SeedChecklist>();

  const legalReferenceCatalog = buildLegalReferenceCatalog(
    sourceData.legalReferences,
    manifest.legalReferences,
  );
  const riskMatrixCatalog = buildRiskMatrices(
    sourceData.riskMatrices,
    manifest.riskMatrices,
  );

  for (const [index, manifestChecklist] of manifest.checklists.entries()) {
    const checklistId = expectNonEmptyString(
      manifestChecklist.id,
      `Seed manifest checklist #${index + 1}.id`,
    );
    const checklistSlug = expectNonEmptyString(
      manifestChecklist.slug,
      `Seed manifest checklist #${index + 1}.slug`,
    );
    const checklistFile = expectNonEmptyString(
      manifestChecklist.file,
      `Seed manifest checklist #${index + 1}.file`,
    );
    const checklistVersion = expectNonEmptyString(
      manifestChecklist.version,
      `Seed manifest checklist ${checklistSlug}.version`,
    );
    const defaultLanguage = expectNonEmptyString(
      manifestChecklist.defaultLanguage,
      `Seed manifest checklist ${checklistSlug}.defaultLanguage`,
    );
    const expectedSectionCount = expectNonNegativeInteger(
      manifestChecklist.sections,
      `Seed manifest checklist ${checklistSlug}.sections`,
    );
    const expectedCriterionCount = expectNonNegativeInteger(
      manifestChecklist.criteria,
      `Seed manifest checklist ${checklistSlug}.criteria`,
    );

    ensure(
      !seenManifestChecklistIds.has(checklistId),
      `Duplicate checklist id in seed manifest: ${checklistId}`,
    );
    seenManifestChecklistIds.add(checklistId);

    ensure(
      !seenManifestChecklistSlugs.has(checklistSlug),
      `Duplicate checklist slug in seed manifest: ${checklistSlug}`,
    );
    seenManifestChecklistSlugs.add(checklistSlug);

    ensure(
      !seenManifestChecklistFiles.has(checklistFile),
      `Duplicate checklist file in seed manifest: ${checklistFile}`,
    );
    seenManifestChecklistFiles.add(checklistFile);

    const rawChecklist = importedChecklistByFile.get(checklistFile);
    ensure(
      rawChecklist !== undefined,
      `Seed manifest references unknown checklist file: ${checklistFile}`,
    );

    const builtChecklist = buildChecklist(
      rawChecklist,
      {
        id: checklistId,
        slug: checklistSlug,
        version: checklistVersion,
        defaultLanguage,
        sections: expectedSectionCount,
        criteria: expectedCriterionCount,
      },
      legalReferenceCatalog.legalReferenceByCode,
    );

    ensure(
      !checklistById.has(builtChecklist.id),
      `Duplicate checklist id in runtime catalog: ${builtChecklist.id}`,
    );
    ensure(
      !checklistBySlug.has(builtChecklist.slug),
      `Duplicate checklist slug in runtime catalog: ${builtChecklist.slug}`,
    );

    checklistById.set(builtChecklist.id, builtChecklist);
    checklistBySlug.set(builtChecklist.slug, builtChecklist);
    builtChecklists.push(builtChecklist);
    builtChecklistSummaries.push({
      id: builtChecklist.id,
      slug: builtChecklist.slug,
      version: builtChecklist.version,
      defaultLanguage: builtChecklist.defaultLanguage,
      sections: builtChecklist.sections.length,
      criteria: countChecklistCriteria(builtChecklist.sections),
      translations: builtChecklist.translations,
    });
  }

  ensure(
    importedChecklistByFile.size === seenManifestChecklistFiles.size,
    "Seed runtime checklist imports and manifest entries must stay aligned",
  );

  const publicManifest: SeedManifest = {
    checklists: builtChecklistSummaries,
    legalReferences: {
      canonicalCount: legalReferenceCatalog.catalog.canonicalReferences.length,
      unresolvedImportedCount:
        legalReferenceCatalog.catalog.unresolvedImportedReferences.length,
      count: legalReferenceCatalog.catalog.allReferences.length,
    },
    riskMatrices: {
      count: riskMatrixCatalog.riskMatrices.length,
    },
  };

  ensure(
    publicManifest.legalReferences.canonicalCount ===
      expectNonNegativeInteger(
        manifest.legalReferences.canonicalCount,
        "Seed manifest legalReferences.canonicalCount",
      ),
    "Seed manifest canonical legal reference count does not match runtime catalog",
  );
  ensure(
    publicManifest.legalReferences.unresolvedImportedCount ===
      expectNonNegativeInteger(
        manifest.legalReferences.unresolvedImportedCount,
        "Seed manifest legalReferences.unresolvedImportedCount",
      ),
    "Seed manifest unresolved imported legal reference count does not match runtime catalog",
  );
  ensure(
    publicManifest.legalReferences.count ===
      expectNonNegativeInteger(
        manifest.legalReferences.count,
        "Seed manifest legalReferences.count",
      ),
    "Seed manifest total legal reference count does not match runtime catalog",
  );
  ensure(
    publicManifest.riskMatrices.count ===
      expectNonNegativeInteger(
        manifest.riskMatrices.count,
        "Seed manifest riskMatrices.count",
      ),
    "Seed manifest risk matrix count does not match runtime catalog",
  );

  deepFreeze(publicManifest);
  deepFreeze(builtChecklists);
  deepFreeze(legalReferenceCatalog.catalog);
  deepFreeze(riskMatrixCatalog.riskMatrices);

  return {
    manifest: publicManifest,
    checklists: builtChecklists,
    checklistById,
    checklistBySlug,
    legalReferenceCatalog: legalReferenceCatalog.catalog,
    legalReferenceByCode: legalReferenceCatalog.legalReferenceByCode,
    riskMatrices: riskMatrixCatalog.riskMatrices,
    riskMatrixById: riskMatrixCatalog.riskMatrixById,
    riskMatrixBySlug: riskMatrixCatalog.riskMatrixBySlug,
  };
}

export function getSeedManifest(): SeedManifest {
  return runtime.manifest;
}

export function listSeedChecklists(): readonly SeedChecklistSummary[] {
  return runtime.manifest.checklists;
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

function buildChecklist(
  rawChecklist: RawChecklist,
  manifestChecklist: {
    id: string;
    slug: string;
    version: string;
    defaultLanguage: string;
    sections: number;
    criteria: number;
  },
  legalReferenceByCode: ReadonlyMap<string, LegalReference>,
): SeedChecklist {
  const checklistId = expectNonEmptyString(rawChecklist.id, "Seed checklist id");
  const checklistSlug = expectNonEmptyString(rawChecklist.slug, "Seed checklist slug");
  const checklistVersion = expectNonEmptyString(
    rawChecklist.version,
    `Seed checklist ${checklistSlug}.version`,
  );
  const defaultLanguage = expectNonEmptyString(
    rawChecklist.defaultLanguage,
    `Seed checklist ${checklistSlug}.defaultLanguage`,
  );

  ensure(
    checklistId === manifestChecklist.id,
    `Seed checklist ${checklistSlug} id does not match manifest (${manifestChecklist.id})`,
  );
  ensure(
    checklistSlug === manifestChecklist.slug,
    `Seed checklist ${checklistId} slug does not match manifest (${manifestChecklist.slug})`,
  );
  ensure(
    checklistVersion === manifestChecklist.version,
    `Seed checklist ${checklistSlug} version does not match manifest (${manifestChecklist.version})`,
  );
  ensure(
    defaultLanguage === manifestChecklist.defaultLanguage,
    `Seed checklist ${checklistSlug} defaultLanguage does not match manifest (${manifestChecklist.defaultLanguage})`,
  );

  const checklist: SeedChecklist = {
    id: checklistId,
    slug: checklistSlug,
    version: checklistVersion,
    defaultLanguage,
    metadata: {
      source: {
        fileName: expectNullableString(
          rawChecklist.metadata?.source?.fileName,
          `Seed checklist ${checklistSlug}.metadata.source.fileName`,
        ),
        url: expectNullableString(
          rawChecklist.metadata?.source?.url,
          `Seed checklist ${checklistSlug}.metadata.source.url`,
        ),
      },
    },
    translations: buildTitleTranslations(
      rawChecklist.translations,
      `Seed checklist ${checklistSlug}.translations`,
    ),
    sections: buildSections(checklistSlug, rawChecklist.sections, legalReferenceByCode),
  };

  ensure(
    checklist.sections.length === manifestChecklist.sections,
    `Seed checklist ${checklist.slug} section count does not match manifest (${manifestChecklist.sections})`,
  );

  const criteriaCount = countChecklistCriteria(checklist.sections);
  ensure(
    criteriaCount === manifestChecklist.criteria,
    `Seed checklist ${checklist.slug} criterion count does not match manifest (${manifestChecklist.criteria})`,
  );

  return checklist;
}

function buildSections(
  checklistSlug: string,
  rawSections: RawSection[],
  legalReferenceByCode: ReadonlyMap<string, LegalReference>,
): readonly SeedSection[] {
  ensure(
    Array.isArray(rawSections),
    `Seed checklist ${checklistSlug}.sections must be an array`,
  );

  const sectionIds = new Set<string>();
  const sections: SeedSection[] = [];

  for (const [sectionIndex, rawSection] of rawSections.entries()) {
    const sectionId = expectNonEmptyString(
      rawSection.id,
      `Seed checklist ${checklistSlug} section #${sectionIndex + 1}.id`,
    );
    const sectionOrder = expectPositiveInteger(
      rawSection.order,
      `Seed checklist ${checklistSlug} section ${sectionId}.order`,
    );

    ensure(
      sectionOrder === sectionIndex + 1,
      `Seed checklist ${checklistSlug} section ${sectionId} must keep contiguous source order`,
    );
    ensure(
      !sectionIds.has(sectionId),
      `Duplicate section id in seed checklist ${checklistSlug}: ${sectionId}`,
    );
    sectionIds.add(sectionId);

    const criteria = buildCriteria(
      checklistSlug,
      sectionId,
      rawSection.criteria,
      legalReferenceByCode,
    );

    sections.push({
      id: sectionId,
      order: sectionOrder,
      translations: buildTitleTranslations(
        rawSection.translations,
        `Seed checklist ${checklistSlug} section ${sectionId}.translations`,
      ),
      criteria,
    });
  }

  return sections;
}

function buildCriteria(
  checklistSlug: string,
  sectionId: string,
  rawCriteria: RawCriterion[],
  legalReferenceByCode: ReadonlyMap<string, LegalReference>,
): readonly SeedCriterion[] {
  ensure(
    Array.isArray(rawCriteria),
    `Seed checklist ${checklistSlug} section ${sectionId}.criteria must be an array`,
  );

  const criterionIds = new Set<string>();
  const criteria: SeedCriterion[] = [];

  for (const [criterionIndex, rawCriterion] of rawCriteria.entries()) {
    const criterionId = expectNonEmptyString(
      rawCriterion.id,
      `Seed checklist ${checklistSlug} criterion #${criterionIndex + 1} in ${sectionId}.id`,
    );
    const criterionOrder = expectPositiveInteger(
      rawCriterion.order,
      `Seed checklist ${checklistSlug} criterion ${criterionId}.order`,
    );

    ensure(
      criterionOrder === criterionIndex + 1,
      `Seed checklist ${checklistSlug} criterion ${criterionId} must keep contiguous source order`,
    );
    ensure(
      !criterionIds.has(criterionId),
      `Duplicate criterion id in seed checklist ${checklistSlug}: ${criterionId}`,
    );
    criterionIds.add(criterionId);

    const legalRefs = buildLegalRefs(
      checklistSlug,
      criterionId,
      rawCriterion.legalRefs,
      legalReferenceByCode,
    );

    criteria.push({
      id: criterionId,
      number: expectNonEmptyString(
        rawCriterion.number,
        `Seed checklist ${checklistSlug} criterion ${criterionId}.number`,
      ),
      order: criterionOrder,
      legalRefs,
      translations: buildCriterionTranslations(
        rawCriterion.translations,
        `Seed checklist ${checklistSlug} criterion ${criterionId}.translations`,
      ),
    });
  }

  return criteria;
}

function buildLegalRefs(
  checklistSlug: string,
  criterionId: string,
  rawLegalRefs: unknown[],
  legalReferenceByCode: ReadonlyMap<string, LegalReference>,
): readonly string[] {
  ensure(
    Array.isArray(rawLegalRefs),
    `Seed checklist ${checklistSlug} criterion ${criterionId}.legalRefs must be an array`,
  );

  const seenLegalRefs = new Set<string>();
  const legalRefs: string[] = [];

  for (const rawLegalRef of rawLegalRefs) {
    const code = expectNonEmptyString(
      rawLegalRef,
      `Seed checklist ${checklistSlug} criterion ${criterionId} legal reference`,
    );

    ensure(
      !seenLegalRefs.has(code),
      `Duplicate legal reference ${code} in criterion ${criterionId}`,
    );
    ensure(
      legalReferenceByCode.has(code),
      `Missing legal reference catalog entry for ${code} in criterion ${criterionId}`,
    );
    seenLegalRefs.add(code);
    legalRefs.push(code);
  }

  return legalRefs;
}

function buildLegalReferenceCatalog(
  rawCatalog: RawLegalReferenceCatalog,
  manifestLegalReferences: RawManifest["legalReferences"],
): {
  readonly catalog: LegalReferenceCatalog;
  readonly legalReferenceByCode: ReadonlyMap<string, LegalReference>;
} {
  ensure(
    Array.isArray(rawCatalog.canonicalReferences),
    "Seed legal reference catalog canonicalReferences must be an array",
  );
  ensure(
    Array.isArray(rawCatalog.unresolvedImportedReferences),
    "Seed legal reference catalog unresolvedImportedReferences must be an array",
  );

  const legalReferenceByCode = new Map<string, LegalReference>();
  const canonicalReferences: CanonicalLegalReference[] = [];
  const unresolvedImportedReferences: UnresolvedImportedLegalReference[] = [];

  for (const [index, rawReference] of rawCatalog.canonicalReferences.entries()) {
    const reference = buildCanonicalLegalReference(rawReference, index);
    ensure(
      !legalReferenceByCode.has(reference.code),
      `Duplicate legal reference code in runtime catalog: ${reference.code}`,
    );
    legalReferenceByCode.set(reference.code, reference);
    canonicalReferences.push(reference);
  }

  for (const [index, rawReference] of rawCatalog.unresolvedImportedReferences.entries()) {
    const reference = buildUnresolvedImportedLegalReference(rawReference, index);
    ensure(
      !legalReferenceByCode.has(reference.code),
      `Duplicate legal reference code in runtime catalog: ${reference.code}`,
    );
    legalReferenceByCode.set(reference.code, reference);
    unresolvedImportedReferences.push(reference);
  }

  const catalog: LegalReferenceCatalog = {
    canonicalReferences,
    unresolvedImportedReferences,
    allReferences: [...canonicalReferences, ...unresolvedImportedReferences],
  };

  ensure(
    canonicalReferences.length ===
      expectNonNegativeInteger(
        manifestLegalReferences.canonicalCount,
        "Seed manifest legalReferences.canonicalCount",
      ),
    "Seed manifest canonical legal reference count does not match runtime catalog",
  );
  ensure(
    unresolvedImportedReferences.length ===
      expectNonNegativeInteger(
        manifestLegalReferences.unresolvedImportedCount,
        "Seed manifest legalReferences.unresolvedImportedCount",
      ),
    "Seed manifest unresolved imported legal reference count does not match runtime catalog",
  );
  ensure(
    catalog.allReferences.length ===
      expectNonNegativeInteger(
        manifestLegalReferences.count,
        "Seed manifest legalReferences.count",
      ),
    "Seed manifest legal reference total count does not match runtime catalog",
  );

  return {
    catalog,
    legalReferenceByCode,
  };
}

function buildCanonicalLegalReference(
  rawReference: RawCanonicalLegalReference,
  index: number,
): CanonicalLegalReference {
  const code = expectNonEmptyString(
    rawReference.code,
    `Canonical legal reference #${index + 1}.code`,
  );

  ensure(
    rawReference.resolutionStatus === "canonical_resolved",
    `Canonical legal reference ${code} must stay canonical_resolved`,
  );

  return {
    id: expectNonEmptyString(
      rawReference.id,
      `Canonical legal reference ${code}.id`,
    ),
    code,
    url: expectNullableString(
      rawReference.url,
      `Canonical legal reference ${code}.url`,
    ),
    translations: buildTitleTranslations(
      rawReference.translations,
      `Canonical legal reference ${code}.translations`,
    ),
    resolutionStatus: "canonical_resolved",
  };
}

function buildUnresolvedImportedLegalReference(
  rawReference: RawUnresolvedImportedLegalReference,
  index: number,
): UnresolvedImportedLegalReference {
  const code = expectNonEmptyString(
    rawReference.code,
    `Unresolved imported legal reference #${index + 1}.code`,
  );

  ensure(
    rawReference.resolutionStatus === "unresolved_imported_code",
    `Unresolved imported legal reference ${code} must stay unresolved_imported_code`,
  );
  ensure(
    rawReference.metadata?.source === "derived-from-checklist-usage",
    `Unresolved imported legal reference ${code}.metadata.source must stay derived-from-checklist-usage`,
  );
  ensure(
    rawReference.metadata?.displayMode === "code_only",
    `Unresolved imported legal reference ${code}.metadata.displayMode must stay code_only`,
  );

  return {
    id: expectNonEmptyString(
      rawReference.id,
      `Unresolved imported legal reference ${code}.id`,
    ),
    code,
    url: expectNullableString(
      rawReference.url,
      `Unresolved imported legal reference ${code}.url`,
    ),
    translations: buildTitleTranslations(
      rawReference.translations,
      `Unresolved imported legal reference ${code}.translations`,
    ),
    resolutionStatus: "unresolved_imported_code",
    metadata: {
      source: "derived-from-checklist-usage",
      displayMode: "code_only",
    },
  };
}

function buildRiskMatrices(
  rawCatalog: RawRiskMatrixCatalog,
  manifestRiskMatrices: RawManifest["riskMatrices"],
): {
  readonly riskMatrices: readonly RiskMatrix[];
  readonly riskMatrixById: ReadonlyMap<string, RiskMatrix>;
  readonly riskMatrixBySlug: ReadonlyMap<string, RiskMatrix>;
} {
  ensure(Array.isArray(rawCatalog.matrices), "Seed risk matrix catalog matrices must be an array");

  const riskMatrices: RiskMatrix[] = [];
  const riskMatrixById = new Map<string, RiskMatrix>();
  const riskMatrixBySlug = new Map<string, RiskMatrix>();

  for (const [index, rawMatrix] of rawCatalog.matrices.entries()) {
    const matrix = buildRiskMatrix(rawMatrix, index);

    ensure(
      !riskMatrixById.has(matrix.id),
      `Duplicate risk matrix id in runtime catalog: ${matrix.id}`,
    );
    ensure(
      !riskMatrixBySlug.has(matrix.slug),
      `Duplicate risk matrix slug in runtime catalog: ${matrix.slug}`,
    );

    riskMatrixById.set(matrix.id, matrix);
    riskMatrixBySlug.set(matrix.slug, matrix);
    riskMatrices.push(matrix);
  }

  ensure(
    riskMatrices.length ===
      expectNonNegativeInteger(
        manifestRiskMatrices.count,
        "Seed manifest riskMatrices.count",
      ),
    "Seed manifest risk matrix count does not match runtime catalog",
  );

  return {
    riskMatrices,
    riskMatrixById,
    riskMatrixBySlug,
  };
}

function buildRiskMatrix(rawMatrix: RawRiskMatrix, index: number): RiskMatrix {
  const matrixId = expectNonEmptyString(rawMatrix.id, `Risk matrix #${index + 1}.id`);
  const matrixSlug = expectNonEmptyString(
    rawMatrix.slug,
    `Risk matrix ${matrixId}.slug`,
  );
  const likelihoodLevels = expectPositiveInteger(
    rawMatrix.likelihoodLevels,
    `Risk matrix ${matrixSlug}.likelihoodLevels`,
  );
  const consequenceLevels = expectPositiveInteger(
    rawMatrix.consequenceLevels,
    `Risk matrix ${matrixSlug}.consequenceLevels`,
  );

  ensure(
    rawMatrix.lookup !== null &&
      typeof rawMatrix.lookup === "object" &&
      !Array.isArray(rawMatrix.lookup),
    `Risk matrix ${matrixSlug}.lookup must be an object`,
  );

  const lookupEntries = Object.entries(rawMatrix.lookup);
  const lookup: Record<string, RiskLevel> = {};

  for (let likelihood = 1; likelihood <= likelihoodLevels; likelihood += 1) {
    for (
      let consequence = 1;
      consequence <= consequenceLevels;
      consequence += 1
    ) {
      const key = `${likelihood},${consequence}`;
      ensure(key in rawMatrix.lookup, `Risk matrix ${matrixSlug} is missing lookup ${key}`);
      const level = rawMatrix.lookup[key];
      ensure(
        typeof level === "string" && allowedRiskLevels.has(level as RiskLevel),
        `Risk matrix ${matrixSlug} lookup ${key} must be low, medium, or high`,
      );
      lookup[key] = level as RiskLevel;
    }
  }

  ensure(
    lookupEntries.length === likelihoodLevels * consequenceLevels,
    `Risk matrix ${matrixSlug} must not expose extra lookup entries`,
  );

  return {
    id: matrixId,
    slug: matrixSlug,
    likelihoodLevels,
    consequenceLevels,
    lookup,
    translations: buildTitleTranslations(
      rawMatrix.translations,
      `Risk matrix ${matrixSlug}.translations`,
    ),
  };
}

function buildTitleTranslations(
  rawTranslations: RawTitleTranslations,
  label: string,
): SeedTitleTranslations {
  ensure(
    rawTranslations !== null &&
      typeof rawTranslations === "object" &&
      rawTranslations.is !== null &&
      typeof rawTranslations.is === "object",
    `${label} must include an is translation`,
  );

  return {
    is: {
      title: expectNonEmptyString(rawTranslations.is.title, `${label}.is.title`),
    },
  };
}

function buildCriterionTranslations(
  rawTranslations: RawCriterionTranslations,
  label: string,
): SeedCriterionTranslations {
  ensure(
    rawTranslations !== null &&
      typeof rawTranslations === "object" &&
      rawTranslations.is !== null &&
      typeof rawTranslations.is === "object",
    `${label} must include an is translation`,
  );

  return {
    is: {
      title: expectNonEmptyString(rawTranslations.is.title, `${label}.is.title`),
      guidance: expectNonEmptyString(
        rawTranslations.is.guidance,
        `${label}.is.guidance`,
      ),
    },
  };
}

function countChecklistCriteria(sections: readonly SeedSection[]): number {
  return sections.reduce((count, section) => count + section.criteria.length, 0);
}

function expectNonEmptyString(value: unknown, label: string): string {
  ensure(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  return value;
}

function expectNullableString(value: unknown, label: string): string | null {
  ensure(
    value === null || typeof value === "string",
    `${label} must be null or a string`,
  );
  return value;
}

function expectPositiveInteger(value: unknown, label: string): number {
  ensure(Number.isInteger(value) && (value as number) > 0, `${label} must be a positive integer`);
  return value as number;
}

function expectNonNegativeInteger(value: unknown, label: string): number {
  ensure(
    Number.isInteger(value) && (value as number) >= 0,
    `${label} must be a non-negative integer`,
  );
  return value as number;
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return value;
  }

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return value;
}
