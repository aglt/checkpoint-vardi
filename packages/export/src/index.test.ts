import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import {
  renderAssessmentReportBundle,
  renderAssessmentReportFiles,
  type AssessmentReportDocuments,
} from "./index.js";

function createSampleDocuments(): AssessmentReportDocuments {
  return {
    checklist: {
      assessmentId: "assessment-123",
      workplaceName: "Workshop Alpha",
      workplaceAddress: "Austurberg 5",
      companyName: "Workshop Alpha",
      location: "Austurberg 5",
      assessmentDate: "2026-04-20",
      checklistTitle: "Woodworking workshop",
      checklistVersion: "2026.1",
      sections: [
        {
          id: "section-1",
          title: "Machines",
          criteria: [
            {
              id: "criterion-1",
              number: "1.1",
              title: "Guarding",
              status: "notOk",
              notes: "Missing table saw guard",
              legalReferences: ["Rg-920/2006 - General obligations", "R-581/1995"],
            },
          ],
        },
      ],
    },
    register: {
      assessmentId: "assessment-123",
      workplaceName: "Workshop Alpha",
      workplaceAddress: "Austurberg 5",
      companyName: "Workshop Alpha",
      location: "Austurberg 5",
      assessmentDate: "2026-04-20",
      checklistTitle: "Woodworking workshop",
      riskMatrixTitle: "Course 3x3",
      entries: [
        {
          id: "entry-1",
          sectionTitle: "Machines",
          criterionNumber: "1.1",
          criterionTitle: "Guarding",
          hazard: "Table saw without guard",
          healthEffects: "Hand injury",
          whoAtRisk: "Students",
          likelihood: "2",
          consequence: "3",
          riskLevel: "High",
          classificationReasoning:
            "Students use the saw daily and the missing guard can cause severe injury.",
          currentControls: "Safety signage",
          costEstimate: "25000",
          mitigationActions: [
            {
              id: "action-1",
              description: "Install replacement guard",
              assigneeName: "Workshop lead",
              dueDate: "2026-04-25",
              statusLabel: "Open",
            },
          ],
        },
      ],
    },
    summary: {
      assessmentId: "assessment-123",
      workplaceName: "Workshop Alpha",
      workplaceAddress: "Austurberg 5",
      companyName: "Workshop Alpha",
      location: "Austurberg 5",
      assessmentDate: "2026-04-20",
      checklistTitle: "Woodworking workshop",
      participants: "Student assessor",
      method: "Walkthrough and review",
      notes: "Guarding and dust extraction are the top priorities.",
    },
  };
}

test("renderAssessmentReportFiles creates valid docx and pdf outputs for all three reports", async () => {
  const files = await renderAssessmentReportFiles(createSampleDocuments());

  assert.deepEqual(
    files.map((file) => file.fileName),
    [
      "checklist.docx",
      "checklist.pdf",
      "register.docx",
      "register.pdf",
      "summary.docx",
      "summary.pdf",
    ],
  );

  const checklistDocx = files.find((file) => file.fileName === "checklist.docx");
  const registerDocx = files.find((file) => file.fileName === "register.docx");
  const summaryDocx = files.find((file) => file.fileName === "summary.docx");
  const checklistPdf = files.find((file) => file.fileName === "checklist.pdf");

  assert.ok(checklistDocx);
  assert.ok(registerDocx);
  assert.ok(summaryDocx);
  assert.ok(checklistPdf);

  const checklistArchive = await JSZip.loadAsync(checklistDocx.bytes);
  const registerArchive = await JSZip.loadAsync(registerDocx.bytes);
  const summaryArchive = await JSZip.loadAsync(summaryDocx.bytes);
  const checklistDocumentXml = await checklistArchive.file("word/document.xml")?.async("string");
  const registerDocumentXml = await registerArchive.file("word/document.xml")?.async("string");
  const summaryDocumentXml = await summaryArchive.file("word/document.xml")?.async("string");

  assert.match(checklistDocumentXml ?? "", /Workshop Alpha/);
  assert.match(checklistDocumentXml ?? "", /Missing table saw guard/);
  assert.match(registerDocumentXml ?? "", /Table saw without guard/);
  assert.match(registerDocumentXml ?? "", /Classification reasoning/);
  assert.match(
    registerDocumentXml ?? "",
    /Students use the saw daily and the missing guard can cause severe injury\./,
  );
  assert.match(registerDocumentXml ?? "", /Install replacement guard/);
  assert.match(registerDocumentXml ?? "", /Mitigation actions/);
  assert.match(summaryDocumentXml ?? "", /Student assessor/);
  assert.match(summaryDocumentXml ?? "", /Guarding and dust extraction/);
  assert.match(
    Buffer.from(checklistPdf.bytes).subarray(0, 5).toString("utf8"),
    /^%PDF-/,
  );
});

test("renderAssessmentReportBundle packages all generated files into a zip bundle", async () => {
  const bundle = await renderAssessmentReportBundle({
    assessmentId: "assessment-123",
    documents: createSampleDocuments(),
  });

  assert.equal(bundle.fileName, "assessment-assessment-123-exports.zip");
  assert.equal(bundle.contentType, "application/zip");
  assert.equal(bundle.files.length, 6);

  const archive = await JSZip.loadAsync(bundle.bytes);
  const zippedFiles = Object.keys(archive.files).sort();

  assert.deepEqual(zippedFiles, [
    "checklist.docx",
    "checklist.pdf",
    "register.docx",
    "register.pdf",
    "summary.docx",
    "summary.pdf",
  ]);

  for (const file of bundle.files) {
    assert.ok(file.sizeBytes > 0);
    assert.ok(archive.file(file.fileName));
  }
});
