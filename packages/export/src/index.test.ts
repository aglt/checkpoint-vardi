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
      title: "Assessment checklist observations",
      sections: [
        {
          title: "Assessment record",
          rows: [
            { label: "Assessment id", value: "assessment-123" },
            { label: "Assessment started", value: "2026-04-20 10:00 UTC" },
            { label: "Assessment date", value: "2026-04-20" },
            { label: "Company", value: "Workshop Alpha" },
          ],
        },
        {
          title: "Framing and provenance",
          rows: [
            {
              label: "Saved-state provenance",
              value:
                "All included values come from saved assessment records and seeded runtime references pinned to this assessment.",
            },
            {
              label: "Unresolved legal-reference handling",
              value:
                "Unresolved imported legal references remain code-only linkage in this export: R-581/1995.",
            },
          ],
        },
        {
          title: "Checklist observations",
          blocks: [
            {
              title: "Criterion 1.1 - Guarding",
              rows: [
                { label: "Checklist section", value: "Machines" },
                { label: "Status", value: "Not ok" },
                { label: "Observation notes", value: "Missing table saw guard" },
                {
                  label: "Legal reference linkage",
                  value: "Rg-920/2006 - General obligations, R-581/1995",
                },
              ],
            },
          ],
        },
      ],
    },
    register: {
      title: "Assessment risk register and classification",
      sections: [
        {
          title: "Risk register and classification",
          blocks: [
            {
              title: "Entry 1 - Table saw without guard",
              rows: [
                { label: "Checklist section", value: "Machines" },
                { label: "Criterion", value: "Criterion 1.1 - Guarding" },
                { label: "Possible health effects", value: "Hand injury" },
                { label: "Who is at risk", value: "Students" },
                { label: "Likelihood", value: "2" },
                { label: "Consequence", value: "3" },
                { label: "Saved risk level", value: "High" },
                {
                  label: "Classification reasoning",
                  value:
                    "Students use the saw daily and the missing guard can cause severe injury.",
                },
                { label: "Current controls", value: "Safety signage" },
                { label: "Cost estimate", value: "25000" },
              ],
            },
          ],
        },
        {
          title: "Mitigation action plan",
          blocks: [
            {
              title: "Entry 1 - Table saw without guard",
              rows: [
                {
                  label: "Action 1",
                  value:
                    "Install replacement guard. Status: Open. Assignee: Workshop lead. Due: 2026-04-25",
                },
              ],
            },
          ],
        },
      ],
    },
    summary: {
      title: "Assessment summary and priority overview",
      sections: [
        {
          title: "Assessment summary",
          rows: [
            { label: "Participants", value: "Student assessor" },
            { label: "Method", value: "Walkthrough and review" },
            {
              label: "Summary notes",
              value: "Guarding and dust extraction are the top priorities.",
            },
          ],
        },
        {
          title: "Priority risk overview",
          rows: [
            {
              label: "Priority 1",
              value:
                "Risk level: High | Hazard: Table saw without guard | Checklist section: Machines | Criterion 1.1 - Guarding",
            },
          ],
        },
      ],
    }
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

  assert.match(checklistDocumentXml ?? "", /Assessment checklist observations/);
  assert.match(checklistDocumentXml ?? "", /Missing table saw guard/);
  assert.match(checklistDocumentXml ?? "", /Unresolved legal-reference handling/);
  assert.match(checklistDocumentXml ?? "", /R-581\/1995/);
  assert.match(registerDocumentXml ?? "", /Table saw without guard/);
  assert.match(registerDocumentXml ?? "", /Classification reasoning/);
  assert.match(
    registerDocumentXml ?? "",
    /Students use the saw daily and the missing guard can cause severe injury\./,
  );
  assert.match(registerDocumentXml ?? "", /Install replacement guard/);
  assert.match(registerDocumentXml ?? "", /Mitigation action plan/);
  assert.match(summaryDocumentXml ?? "", /Student assessor/);
  assert.match(summaryDocumentXml ?? "", /Priority risk overview/);
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
