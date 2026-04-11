import assert from "node:assert/strict";
import test from "node:test";

import constructionSiteSource from "../assets/seeds/construction-site.json";
import legalReferencesSource from "../assets/seeds/legal_references.json";
import manifestSource from "../assets/seeds/manifest.json";
import riskMatricesSource from "../assets/seeds/risk_matrices.json";
import woodworkingWorkshopSource from "../assets/seeds/woodworking-workshop.json";

import {
  getLegalReferenceByCode,
  getLegalReferenceCatalog,
  getRiskMatrixBySlug,
  getSeedChecklistBySlug,
  listLegalReferences,
  listRiskMatrices,
  listSeedChecklists,
} from "./index.js";
import {
  buildSeedRuntime,
  type SeedRuntimeSourceData,
} from "./internal/runtime-builder.js";

function createSourceData(): SeedRuntimeSourceData {
  return JSON.parse(JSON.stringify({
    manifest: manifestSource,
    checklists: [
      {
        file: "woodworking-workshop.json",
        checklist: woodworkingWorkshopSource,
      },
      {
        file: "construction-site.json",
        checklist: constructionSiteSource,
      },
    ],
    legalReferences: legalReferencesSource,
    riskMatrices: riskMatricesSource,
  })) as SeedRuntimeSourceData;
}

test("public seam preserves manifest and source ordering", () => {
  const sourceData = createSourceData();
  const summaries = listSeedChecklists();

  assert.deepEqual(
    summaries.map((summary) => summary.slug),
    sourceData.manifest.checklists.map((summary) => summary.slug as string),
  );
  assert.deepEqual(
    summaries.map((summary) => summary.slug),
    ["woodworking-workshop", "construction-site"],
  );
  assert.equal("file" in summaries[0], false);

  const woodworkingChecklist = getSeedChecklistBySlug("woodworking-workshop");
  assert.ok(woodworkingChecklist);
  if (!woodworkingChecklist) {
    throw new Error("Expected woodworking seed checklist");
  }
  assert.equal(woodworkingChecklist.sections[0]?.id, "woodworking-workshop.section-01");
  assert.equal(
    woodworkingChecklist.sections[0]?.criteria[0]?.id,
    "woodworking-workshop.section-01.criterion-01",
  );
  assert.equal(
    woodworkingChecklist.sections.at(-1)?.id,
    "woodworking-workshop.section-15",
  );

  const riskMatrices = listRiskMatrices();
  assert.deepEqual(
    riskMatrices.map((matrix) => matrix.slug),
    ["simple-2x2", "course-3x3", "guide-5x5"],
  );
  assert.equal(getRiskMatrixBySlug("course-3x3")?.translations.is.title, "Námsefni 3x3");
});

test("unresolved legal references stay explicitly unresolved at runtime", () => {
  const catalog = getLegalReferenceCatalog();
  const unresolvedReference = getLegalReferenceByCode("FL-1/2019");
  const canonicalReference = getLegalReferenceByCode("L-46/1980");
  const legalReferences = listLegalReferences();

  assert.ok(unresolvedReference);
  if (!unresolvedReference) {
    throw new Error("Expected unresolved imported legal reference");
  }
  assert.equal(unresolvedReference.resolutionStatus, "unresolved_imported_code");
  assert.equal(unresolvedReference.translations.is.title, "FL-1/2019");
  assert.equal("title" in unresolvedReference, false);
  assert.equal(
    catalog.unresolvedImportedReferences.some((reference) => reference.code === "FL-1/2019"),
    true,
  );
  assert.equal(
    catalog.canonicalReferences.some((reference) => reference.code === "FL-1/2019"),
    false,
  );
  assert.equal(
    legalReferences.find((reference) => reference.code === "FL-1/2019")?.resolutionStatus,
    "unresolved_imported_code",
  );

  assert.ok(canonicalReference);
  if (!canonicalReference) {
    throw new Error("Expected canonical legal reference");
  }
  assert.equal(canonicalReference.resolutionStatus, "canonical_resolved");
});

test("runtime builder fails fast when manifest checklist files drift", () => {
  const sourceData = createSourceData();
  sourceData.manifest.checklists[0]!.file = "missing-checklist.json";

  assert.throws(
    () => buildSeedRuntime(sourceData),
    /Seed manifest references unknown checklist file: missing-checklist\.json/,
  );
});

test("runtime builder fails fast on checklist id or slug mismatches", () => {
  const mismatchedSourceData = createSourceData();
  mismatchedSourceData.manifest.checklists[0]!.slug = "renamed-woodworking";

  assert.throws(
    () => buildSeedRuntime(mismatchedSourceData),
    /slug does not match manifest/,
  );

  const duplicateSourceData = createSourceData();
  duplicateSourceData.manifest.checklists[1]!.slug =
    duplicateSourceData.manifest.checklists[0]!.slug;

  assert.throws(
    () => buildSeedRuntime(duplicateSourceData),
    /Duplicate checklist slug in seed manifest/,
  );
});

test("runtime builder fails fast on risk-matrix id or slug mismatches", () => {
  const duplicateSlugSourceData = createSourceData();
  duplicateSlugSourceData.riskMatrices.matrices[1]!.slug =
    duplicateSlugSourceData.riskMatrices.matrices[0]!.slug;

  assert.throws(
    () => buildSeedRuntime(duplicateSlugSourceData),
    /Duplicate risk matrix slug in runtime catalog/,
  );

  const duplicateIdSourceData = createSourceData();
  duplicateIdSourceData.riskMatrices.matrices[1]!.id =
    duplicateIdSourceData.riskMatrices.matrices[0]!.id;

  assert.throws(
    () => buildSeedRuntime(duplicateIdSourceData),
    /Duplicate risk matrix id in runtime catalog/,
  );
});

test("runtime builder fails fast when legal-reference integrity breaks", () => {
  const duplicateCodeSourceData = createSourceData();
  duplicateCodeSourceData.legalReferences.unresolvedImportedReferences[0]!.code =
    duplicateCodeSourceData.legalReferences.canonicalReferences[0]!.code;

  assert.throws(
    () => buildSeedRuntime(duplicateCodeSourceData),
    /Duplicate legal reference code in runtime catalog/,
  );

  const missingCatalogCodeSourceData = createSourceData();
  missingCatalogCodeSourceData.checklists[0]!.checklist.sections[0]!.criteria[0]!.legalRefs = [
    "missing-legal-code",
  ];

  assert.throws(
    () => buildSeedRuntime(missingCatalogCodeSourceData),
    /Missing legal reference catalog entry for missing-legal-code/,
  );
});
