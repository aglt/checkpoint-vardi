import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const seedsDir = path.resolve(scriptDir, "../assets/seeds");

const allowedRiskLevels = new Set(["low", "medium", "high"]);
const errors = [];

const readJson = (file) =>
  JSON.parse(readFileSync(path.join(seedsDir, file), "utf8"));

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const fail = (message) => {
  errors.push(message);
};

const ensure = (condition, message) => {
  if (!condition) {
    fail(message);
  }
};

const ensureString = (value, message) => {
  ensure(typeof value === "string" && value.length > 0, message);
};

const ensureTranslationTitle = (value, message) => {
  ensure(isPlainObject(value), `${message} must be an object`);
  ensure(isPlainObject(value.is), `${message}.is must be an object`);
  ensureString(value.is.title, `${message}.is.title must be a non-empty string`);
};

const manifest = readJson("manifest.json");

ensure(Array.isArray(manifest.checklists), "manifest.checklists must be an array");
ensure(
  isPlainObject(manifest.legalReferences),
  "manifest.legalReferences must be an object",
);
ensure(
  isPlainObject(manifest.riskMatrices),
  "manifest.riskMatrices must be an object",
);

const legalFile = manifest.legalReferences?.file;
const riskMatrixFile = manifest.riskMatrices?.file;

ensureString(legalFile, "manifest.legalReferences.file");
ensureString(riskMatrixFile, "manifest.riskMatrices.file");

const legalCatalog = readJson(legalFile);
const riskCatalog = readJson(riskMatrixFile);

ensure(Array.isArray(legalCatalog.references), "legal catalog must expose references[]");
ensure(Array.isArray(riskCatalog.matrices), "risk matrix catalog must expose matrices[]");

const legalByCode = new Map();
for (const [index, reference] of legalCatalog.references.entries()) {
  ensure(isPlainObject(reference), `legal reference #${index + 1} must be an object`);
  ensureString(reference.id, `legal reference #${index + 1}.id`);
  ensureString(reference.code, `legal reference #${index + 1}.code`);
  ensureTranslationTitle(
    reference.translations,
    `legal reference ${reference.code}.translations`,
  );
  ensure(
    reference.url === null || typeof reference.url === "string",
    `legal reference ${reference.code}.url must be null or string`,
  );
  if (legalByCode.has(reference.code)) {
    fail(`duplicate legal reference code: ${reference.code}`);
  } else {
    legalByCode.set(reference.code, reference);
  }
}

ensure(
  legalCatalog.references.length === manifest.legalReferences.count,
  `manifest legal reference count ${manifest.legalReferences.count} does not match ${legalCatalog.references.length}`,
);

const matrixIds = new Set();
const matrixSlugs = new Set();
for (const [index, matrix] of riskCatalog.matrices.entries()) {
  ensure(isPlainObject(matrix), `risk matrix #${index + 1} must be an object`);
  ensureString(matrix.id, `risk matrix #${index + 1}.id`);
  ensureString(matrix.slug, `risk matrix #${index + 1}.slug`);
  ensure(
    Number.isInteger(matrix.likelihoodLevels) && matrix.likelihoodLevels > 0,
    `risk matrix ${matrix.slug}.likelihoodLevels must be a positive integer`,
  );
  ensure(
    Number.isInteger(matrix.consequenceLevels) && matrix.consequenceLevels > 0,
    `risk matrix ${matrix.slug}.consequenceLevels must be a positive integer`,
  );
  ensureTranslationTitle(
    matrix.translations,
    `risk matrix ${matrix.slug}.translations`,
  );
  ensure(isPlainObject(matrix.lookup), `risk matrix ${matrix.slug}.lookup must be an object`);

  if (matrixIds.has(matrix.id)) {
    fail(`duplicate risk matrix id: ${matrix.id}`);
  } else {
    matrixIds.add(matrix.id);
  }

  if (matrixSlugs.has(matrix.slug)) {
    fail(`duplicate risk matrix slug: ${matrix.slug}`);
  } else {
    matrixSlugs.add(matrix.slug);
  }

  for (let likelihood = 1; likelihood <= matrix.likelihoodLevels; likelihood += 1) {
    for (let consequence = 1; consequence <= matrix.consequenceLevels; consequence += 1) {
      const key = `${likelihood},${consequence}`;
      ensure(key in matrix.lookup, `risk matrix ${matrix.slug} is missing lookup ${key}`);
      ensure(
        allowedRiskLevels.has(matrix.lookup[key]),
        `risk matrix ${matrix.slug} has invalid lookup value for ${key}`,
      );
    }
  }

  const expectedEntries = matrix.likelihoodLevels * matrix.consequenceLevels;
  ensure(
    Object.keys(matrix.lookup).length === expectedEntries,
    `risk matrix ${matrix.slug} has ${Object.keys(matrix.lookup).length} lookup entries, expected ${expectedEntries}`,
  );
}

ensure(
  riskCatalog.matrices.length === manifest.riskMatrices.count,
  `manifest risk matrix count ${manifest.riskMatrices.count} does not match ${riskCatalog.matrices.length}`,
);

const checklistIds = new Set();
const checklistSlugs = new Set();
const checklistFiles = new Set();
let totalCriteria = 0;

for (const [index, entry] of manifest.checklists.entries()) {
  ensure(isPlainObject(entry), `manifest checklist #${index + 1} must be an object`);
  ensureString(entry.id, `manifest checklist #${index + 1}.id`);
  ensureString(entry.slug, `manifest checklist #${index + 1}.slug`);
  ensureString(entry.file, `manifest checklist #${index + 1}.file`);
  ensureString(entry.version, `manifest checklist #${index + 1}.version`);
  ensureString(
    entry.defaultLanguage,
    `manifest checklist #${index + 1}.defaultLanguage`,
  );
  ensure(
    Number.isInteger(entry.sections) && entry.sections >= 0,
    `manifest checklist ${entry.slug}.sections must be an integer`,
  );
  ensure(
    Number.isInteger(entry.criteria) && entry.criteria >= 0,
    `manifest checklist ${entry.slug}.criteria must be an integer`,
  );

  if (checklistIds.has(entry.id)) {
    fail(`duplicate checklist id in manifest: ${entry.id}`);
  } else {
    checklistIds.add(entry.id);
  }

  if (checklistSlugs.has(entry.slug)) {
    fail(`duplicate checklist slug in manifest: ${entry.slug}`);
  } else {
    checklistSlugs.add(entry.slug);
  }

  if (checklistFiles.has(entry.file)) {
    fail(`duplicate checklist file in manifest: ${entry.file}`);
  } else {
    checklistFiles.add(entry.file);
  }

  const checklist = readJson(entry.file);
  ensure(checklist.id === entry.id, `checklist ${entry.file} id does not match manifest`);
  ensure(checklist.slug === entry.slug, `checklist ${entry.file} slug does not match manifest`);
  ensure(
    checklist.version === entry.version,
    `checklist ${entry.file} version does not match manifest`,
  );
  ensure(
    checklist.defaultLanguage === entry.defaultLanguage,
    `checklist ${entry.file} defaultLanguage does not match manifest`,
  );
  ensureTranslationTitle(
    checklist.translations,
    `checklist ${entry.slug}.translations`,
  );
  ensure(
    isPlainObject(checklist.metadata) && isPlainObject(checklist.metadata.source),
    `checklist ${entry.slug}.metadata.source must be an object`,
  );
  ensure(
    checklist.metadata.source.fileName === null ||
      typeof checklist.metadata.source.fileName === "string",
    `checklist ${entry.slug}.metadata.source.fileName must be null or string`,
  );
  ensure(
    checklist.metadata.source.url === null ||
      typeof checklist.metadata.source.url === "string",
    `checklist ${entry.slug}.metadata.source.url must be null or string`,
  );
  ensure(Array.isArray(checklist.sections), `checklist ${entry.slug}.sections must be an array`);
  ensure(
    checklist.sections.length === entry.sections,
    `checklist ${entry.slug} section count does not match manifest`,
  );

  const sectionIds = new Set();
  const criterionIds = new Set();
  let criteriaInChecklist = 0;

  for (const [sectionIndex, section] of checklist.sections.entries()) {
    ensure(isPlainObject(section), `checklist ${entry.slug} section #${sectionIndex + 1} must be an object`);
    ensureString(section.id, `checklist ${entry.slug} section #${sectionIndex + 1}.id`);
    ensure(
      Number.isInteger(section.order) && section.order === sectionIndex + 1,
      `checklist ${entry.slug} section ${section.id} must have contiguous order`,
    );
    ensureTranslationTitle(
      section.translations,
      `checklist ${entry.slug} section ${section.id}.translations`,
    );
    ensure(
      Array.isArray(section.criteria),
      `checklist ${entry.slug} section ${section.id}.criteria must be an array`,
    );
    if (sectionIds.has(section.id)) {
      fail(`duplicate section id in checklist ${entry.slug}: ${section.id}`);
    } else {
      sectionIds.add(section.id);
    }

    for (const [criterionIndex, criterion] of section.criteria.entries()) {
      ensure(
        isPlainObject(criterion),
        `checklist ${entry.slug} criterion #${criterionIndex + 1} in ${section.id} must be an object`,
      );
      ensureString(
        criterion.id,
        `checklist ${entry.slug} criterion #${criterionIndex + 1} in ${section.id}.id`,
      );
      ensure(
        typeof criterion.number === "string" && criterion.number.length > 0,
        `checklist ${entry.slug} criterion ${criterion.id}.number must be a non-empty string`,
      );
      ensure(
        Number.isInteger(criterion.order) && criterion.order === criterionIndex + 1,
        `checklist ${entry.slug} criterion ${criterion.id} must have contiguous order`,
      );
      ensureTranslationTitle(
        criterion.translations,
        `checklist ${entry.slug} criterion ${criterion.id}.translations`,
      );
      ensure(
        Array.isArray(criterion.legalRefs),
        `checklist ${entry.slug} criterion ${criterion.id}.legalRefs must be an array`,
      );
      if (criterionIds.has(criterion.id)) {
        fail(`duplicate criterion id in checklist ${entry.slug}: ${criterion.id}`);
      } else {
        criterionIds.add(criterion.id);
      }

      const legalRefs = new Set();
      for (const code of criterion.legalRefs) {
        ensureString(
          code,
          `checklist ${entry.slug} criterion ${criterion.id} legal reference code`,
        );
        if (legalRefs.has(code)) {
          fail(`duplicate legal reference ${code} in criterion ${criterion.id}`);
        } else {
          legalRefs.add(code);
        }
        if (!legalByCode.has(code)) {
          fail(`missing legal reference catalog entry for ${code}`);
        }
      }

      criteriaInChecklist += 1;
    }
  }

  ensure(
    criteriaInChecklist === entry.criteria,
    `checklist ${entry.slug} criterion count does not match manifest`,
  );

  totalCriteria += criteriaInChecklist;
}

if (errors.length > 0) {
  console.error("Seed validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Validated ${manifest.checklists.length} checklists, ${legalCatalog.references.length} legal references, ${riskCatalog.matrices.length} risk matrices, and ${totalCriteria} total criteria.`,
);
