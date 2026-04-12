import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import JSZip from "jszip";
import PDFDocument from "pdfkit";

export type ChecklistCriterionStatus =
  | "ok"
  | "notOk"
  | "notApplicable"
  | "unanswered";
export type AssessmentReportFormat = "docx" | "pdf";
export type AssessmentReportKind = "checklist" | "register" | "summary";

export interface AssessmentReportHeader {
  readonly assessmentId: string;
  readonly workplaceName: string;
  readonly workplaceAddress: string | null;
  readonly companyName: string;
  readonly location: string;
  readonly assessmentDate: string;
}

export interface ChecklistCriterionReport {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly status: ChecklistCriterionStatus;
  readonly notes: string;
  readonly legalReferences: readonly string[];
}

export interface ChecklistSectionReport {
  readonly id: string;
  readonly title: string;
  readonly criteria: readonly ChecklistCriterionReport[];
}

export interface ChecklistReportDocument extends AssessmentReportHeader {
  readonly checklistTitle: string;
  readonly checklistVersion: string;
  readonly sections: readonly ChecklistSectionReport[];
}

export interface RegisterEntryReport {
  readonly id: string;
  readonly sectionTitle: string;
  readonly criterionNumber: string;
  readonly criterionTitle: string;
  readonly hazard: string;
  readonly healthEffects: string;
  readonly whoAtRisk: string;
  readonly likelihood: string;
  readonly consequence: string;
  readonly riskLevel: string;
  readonly currentControls: string;
  readonly costEstimate: string;
  readonly mitigationActions: readonly RegisterMitigationActionReport[];
}

export interface RegisterMitigationActionReport {
  readonly id: string;
  readonly description: string;
  readonly assigneeName: string;
  readonly dueDate: string;
  readonly statusLabel: string;
}

export interface RegisterReportDocument extends AssessmentReportHeader {
  readonly checklistTitle: string;
  readonly riskMatrixTitle: string;
  readonly entries: readonly RegisterEntryReport[];
}

export interface SummaryReportDocument extends AssessmentReportHeader {
  readonly checklistTitle: string;
  readonly participants: string;
  readonly method: string;
  readonly notes: string;
}

export interface AssessmentReportDocuments {
  readonly checklist: ChecklistReportDocument;
  readonly register: RegisterReportDocument;
  readonly summary: SummaryReportDocument;
}

export interface RenderedAssessmentReportFile {
  readonly kind: AssessmentReportKind;
  readonly format: AssessmentReportFormat;
  readonly fileName: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

export interface AssessmentReportBundleFile {
  readonly kind: AssessmentReportKind;
  readonly format: AssessmentReportFormat;
  readonly fileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

export interface RenderAssessmentReportBundleResult {
  readonly assessmentId: string;
  readonly fileName: string;
  readonly contentType: "application/zip";
  readonly bytes: Uint8Array;
  readonly files: readonly AssessmentReportBundleFile[];
}

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_CONTENT_TYPE = "application/pdf";
const EMPTY_VALUE = "Not provided.";
const STATUS_LABELS: Record<ChecklistCriterionStatus, string> = {
  ok: "Ok",
  notOk: "Not ok",
  notApplicable: "Not applicable",
  unanswered: "Unanswered",
};

export async function renderAssessmentReportFiles(
  documents: AssessmentReportDocuments,
): Promise<readonly RenderedAssessmentReportFile[]> {
  const checklistDocx = await renderChecklistReportDocx(documents.checklist);
  const checklistPdf = await renderChecklistReportPdf(documents.checklist);
  const registerDocx = await renderRegisterReportDocx(documents.register);
  const registerPdf = await renderRegisterReportPdf(documents.register);
  const summaryDocx = await renderSummaryReportDocx(documents.summary);
  const summaryPdf = await renderSummaryReportPdf(documents.summary);

  return [
    {
      kind: "checklist",
      format: "docx",
      fileName: "checklist.docx",
      contentType: DOCX_CONTENT_TYPE,
      bytes: checklistDocx,
    },
    {
      kind: "checklist",
      format: "pdf",
      fileName: "checklist.pdf",
      contentType: PDF_CONTENT_TYPE,
      bytes: checklistPdf,
    },
    {
      kind: "register",
      format: "docx",
      fileName: "register.docx",
      contentType: DOCX_CONTENT_TYPE,
      bytes: registerDocx,
    },
    {
      kind: "register",
      format: "pdf",
      fileName: "register.pdf",
      contentType: PDF_CONTENT_TYPE,
      bytes: registerPdf,
    },
    {
      kind: "summary",
      format: "docx",
      fileName: "summary.docx",
      contentType: DOCX_CONTENT_TYPE,
      bytes: summaryDocx,
    },
    {
      kind: "summary",
      format: "pdf",
      fileName: "summary.pdf",
      contentType: PDF_CONTENT_TYPE,
      bytes: summaryPdf,
    },
  ];
}

export async function renderAssessmentReportBundle(params: {
  readonly assessmentId: string;
  readonly documents: AssessmentReportDocuments;
}): Promise<RenderAssessmentReportBundleResult> {
  const files = await renderAssessmentReportFiles(params.documents);
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.fileName, file.bytes);
  }

  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });

  return {
    assessmentId: params.assessmentId,
    fileName: `assessment-${params.assessmentId}-exports.zip`,
    contentType: "application/zip",
    bytes,
    files: files.map((file) => ({
      kind: file.kind,
      format: file.format,
      fileName: file.fileName,
      contentType: file.contentType,
      sizeBytes: file.bytes.byteLength,
    })),
  };
}

export async function renderChecklistReportDocx(
  document: ChecklistReportDocument,
): Promise<Uint8Array> {
  const children: Array<Paragraph> = [
    createTitleParagraph("Checklist report"),
    ...buildHeaderParagraphs(document, [
      ["Checklist", document.checklistTitle],
      ["Checklist version", document.checklistVersion],
    ]),
  ];

  for (const section of document.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        text: section.title,
        spacing: { before: 240, after: 120 },
      }),
    );

    for (const criterion of section.criteria) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          text: `Criterion ${criterion.number} - ${criterion.title}`,
          spacing: { before: 120, after: 80 },
        }),
      );
      children.push(
        createKeyValueParagraph("Status", STATUS_LABELS[criterion.status]),
        createKeyValueParagraph("Notes", toDisplayValue(criterion.notes)),
        createKeyValueParagraph(
          "Legal references",
          criterion.legalReferences.length > 0
            ? criterion.legalReferences.join(", ")
            : "No legal references listed.",
        ),
      );
    }
  }

  return renderDocx(children);
}

export async function renderChecklistReportPdf(
  document: ChecklistReportDocument,
): Promise<Uint8Array> {
  return renderPdf((pdf) => {
    writePdfTitle(pdf, "Checklist report");
    writePdfHeader(pdf, document, [
      ["Checklist", document.checklistTitle],
      ["Checklist version", document.checklistVersion],
    ]);

    for (const section of document.sections) {
      writePdfSectionHeading(pdf, section.title);

      for (const criterion of section.criteria) {
        writePdfEntryHeading(
          pdf,
          `Criterion ${criterion.number} - ${criterion.title}`,
        );
        writePdfKeyValue(pdf, "Status", STATUS_LABELS[criterion.status]);
        writePdfKeyValue(pdf, "Notes", toDisplayValue(criterion.notes));
        writePdfKeyValue(
          pdf,
          "Legal references",
          criterion.legalReferences.length > 0
            ? criterion.legalReferences.join(", ")
            : "No legal references listed.",
        );
      }
    }
  });
}

export async function renderRegisterReportDocx(
  document: RegisterReportDocument,
): Promise<Uint8Array> {
  const children: Array<Paragraph> = [
    createTitleParagraph("Risk register"),
    ...buildHeaderParagraphs(document, [
      ["Checklist", document.checklistTitle],
      ["Risk matrix", document.riskMatrixTitle],
    ]),
  ];

  if (document.entries.length === 0) {
    children.push(
      createKeyValueParagraph("Entries", "No transferred risk entries were exported."),
    );
  }

  for (const [index, entry] of document.entries.entries()) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        text: `Entry ${index + 1} - ${entry.hazard}`,
        spacing: { before: 240, after: 120 },
      }),
      createKeyValueParagraph(
        "Traceability",
        `${entry.sectionTitle} · Criterion ${entry.criterionNumber} · ${entry.criterionTitle}`,
      ),
      createKeyValueParagraph("Possible health effects", toDisplayValue(entry.healthEffects)),
      createKeyValueParagraph("Who is at risk", toDisplayValue(entry.whoAtRisk)),
      createKeyValueParagraph("Likelihood", toDisplayValue(entry.likelihood)),
      createKeyValueParagraph("Consequence", toDisplayValue(entry.consequence)),
      createKeyValueParagraph("Risk level", toDisplayValue(entry.riskLevel)),
      createKeyValueParagraph("Current controls", toDisplayValue(entry.currentControls)),
      createKeyValueParagraph("Cost estimate", toDisplayValue(entry.costEstimate)),
      createKeyValueParagraph(
        "Mitigation actions",
        formatRegisterMitigationActions(entry.mitigationActions),
      ),
    );
  }

  return renderDocx(children);
}

export async function renderRegisterReportPdf(
  document: RegisterReportDocument,
): Promise<Uint8Array> {
  return renderPdf((pdf) => {
    writePdfTitle(pdf, "Risk register");
    writePdfHeader(pdf, document, [
      ["Checklist", document.checklistTitle],
      ["Risk matrix", document.riskMatrixTitle],
    ]);

    if (document.entries.length === 0) {
      writePdfKeyValue(pdf, "Entries", "No transferred risk entries were exported.");
      return;
    }

    for (const [index, entry] of document.entries.entries()) {
      writePdfSectionHeading(pdf, `Entry ${index + 1} - ${entry.hazard}`);
      writePdfKeyValue(
        pdf,
        "Traceability",
        `${entry.sectionTitle} · Criterion ${entry.criterionNumber} · ${entry.criterionTitle}`,
      );
      writePdfKeyValue(pdf, "Possible health effects", toDisplayValue(entry.healthEffects));
      writePdfKeyValue(pdf, "Who is at risk", toDisplayValue(entry.whoAtRisk));
      writePdfKeyValue(pdf, "Likelihood", toDisplayValue(entry.likelihood));
      writePdfKeyValue(pdf, "Consequence", toDisplayValue(entry.consequence));
      writePdfKeyValue(pdf, "Risk level", toDisplayValue(entry.riskLevel));
      writePdfKeyValue(pdf, "Current controls", toDisplayValue(entry.currentControls));
      writePdfKeyValue(pdf, "Cost estimate", toDisplayValue(entry.costEstimate));
      writePdfKeyValue(
        pdf,
        "Mitigation actions",
        formatRegisterMitigationActions(entry.mitigationActions),
      );
    }
  });
}

export async function renderSummaryReportDocx(
  document: SummaryReportDocument,
): Promise<Uint8Array> {
  const children: Array<Paragraph> = [
    createTitleParagraph("Assessment summary"),
    ...buildHeaderParagraphs(document, [["Checklist", document.checklistTitle]]),
    createKeyValueParagraph("Participants", document.participants),
    createKeyValueParagraph("Method", document.method),
    createKeyValueParagraph("Summary notes", document.notes),
  ];

  return renderDocx(children);
}

export async function renderSummaryReportPdf(
  document: SummaryReportDocument,
): Promise<Uint8Array> {
  return renderPdf((pdf) => {
    writePdfTitle(pdf, "Assessment summary");
    writePdfHeader(pdf, document, [["Checklist", document.checklistTitle]]);
    writePdfKeyValue(pdf, "Participants", document.participants);
    writePdfKeyValue(pdf, "Method", document.method);
    writePdfKeyValue(pdf, "Summary notes", document.notes);
  });
}

function buildHeaderParagraphs(
  header: AssessmentReportHeader,
  extraRows: readonly [string, string][],
): readonly Paragraph[] {
  const rows: Array<readonly [string, string | null]> = [
    ["Assessment id", header.assessmentId],
    ["Workplace", header.workplaceName],
    ["Workplace address", header.workplaceAddress],
    ["Company", header.companyName],
    ["Location", header.location],
    ["Assessment date", header.assessmentDate],
    ...extraRows,
  ];

  return rows.map(([label, value]) =>
    createKeyValueParagraph(label, toDisplayValue(value)),
  );
}

function createTitleParagraph(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    text,
    spacing: { after: 180 },
  });
}

function createKeyValueParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
      }),
      ...buildTextRuns(value),
    ],
  });
}

function buildTextRuns(value: string): TextRun[] {
  return value.split(/\r?\n/).flatMap((line, index) => {
    const run = new TextRun({
      text: line,
      break: index === 0 ? 0 : 1,
    });

    return [run];
  });
}

async function renderDocx(children: readonly Paragraph[]): Promise<Uint8Array> {
  const document = new Document({
    sections: [
      {
        children: [...children],
      },
    ],
  });
  const buffer = await Packer.toBuffer(document);
  return new Uint8Array(buffer);
}

async function renderPdf(
  build: (document: PDFKit.PDFDocument) => void,
): Promise<Uint8Array> {
  const document = new PDFDocument({
    size: "A4",
    margin: 48,
  });

  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    document.on("end", () => {
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });
    document.on("error", reject);

    build(document);
    document.end();
  });
}

function writePdfTitle(document: PDFKit.PDFDocument, value: string) {
  document.fontSize(20).font("Helvetica-Bold").text(value);
  document.moveDown(0.5);
}

function writePdfHeader(
  document: PDFKit.PDFDocument,
  header: AssessmentReportHeader,
  extraRows: readonly [string, string][],
) {
  const rows: Array<readonly [string, string | null]> = [
    ["Assessment id", header.assessmentId],
    ["Workplace", header.workplaceName],
    ["Workplace address", header.workplaceAddress],
    ["Company", header.companyName],
    ["Location", header.location],
    ["Assessment date", header.assessmentDate],
    ...extraRows,
  ];

  for (const [label, value] of rows) {
    writePdfKeyValue(document, label, toDisplayValue(value));
  }

  document.moveDown(0.5);
}

function writePdfSectionHeading(document: PDFKit.PDFDocument, value: string) {
  document.moveDown(0.5);
  document.fontSize(15).font("Helvetica-Bold").text(value);
  document.moveDown(0.3);
}

function writePdfEntryHeading(document: PDFKit.PDFDocument, value: string) {
  document.fontSize(12).font("Helvetica-Bold").text(value);
  document.moveDown(0.2);
}

function writePdfKeyValue(
  document: PDFKit.PDFDocument,
  label: string,
  value: string,
) {
  document
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(`${label}: `, { continued: true });
  document
    .font("Helvetica")
    .text(value, {
      width: document.page.width - document.page.margins.left - document.page.margins.right,
    });
}

function toDisplayValue(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : EMPTY_VALUE;
}

function formatRegisterMitigationActions(
  actions: readonly RegisterMitigationActionReport[],
): string {
  if (actions.length === 0) {
    return "No saved mitigation actions.";
  }

  return actions
    .map((action, index) => {
      const detailParts = [
        `Status: ${action.statusLabel}`,
        action.assigneeName.trim().length > 0 ? `Assignee: ${action.assigneeName}` : null,
        action.dueDate.trim().length > 0 ? `Due: ${action.dueDate}` : null,
      ].filter((value): value is string => value != null);

      return `${index + 1}. ${action.description} (${detailParts.join("; ")})`;
    })
    .join("\n");
}
