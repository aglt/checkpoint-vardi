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

export interface AssessmentReportRow {
  readonly label: string;
  readonly value: string;
}

export interface AssessmentReportBlock {
  readonly title: string;
  readonly rows: readonly AssessmentReportRow[];
}

export interface AssessmentReportSection {
  readonly title: string;
  readonly description?: string;
  readonly rows?: readonly AssessmentReportRow[];
  readonly blocks?: readonly AssessmentReportBlock[];
}

export interface AssessmentStructuredReportDocument {
  readonly title: string;
  readonly sections: readonly AssessmentReportSection[];
}

export interface AssessmentReportDocuments {
  readonly checklist: AssessmentStructuredReportDocument;
  readonly register: AssessmentStructuredReportDocument;
  readonly summary: AssessmentStructuredReportDocument;
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
  document: AssessmentStructuredReportDocument,
): Promise<Uint8Array> {
  return renderAssessmentReportDocx(document);
}

export async function renderChecklistReportPdf(
  document: AssessmentStructuredReportDocument,
): Promise<Uint8Array> {
  return renderAssessmentReportPdf(document);
}

export async function renderRegisterReportDocx(
  document: AssessmentStructuredReportDocument,
): Promise<Uint8Array> {
  return renderAssessmentReportDocx(document);
}

export async function renderRegisterReportPdf(
  document: AssessmentStructuredReportDocument,
): Promise<Uint8Array> {
  return renderAssessmentReportPdf(document);
}

export async function renderSummaryReportDocx(
  document: AssessmentStructuredReportDocument,
): Promise<Uint8Array> {
  return renderAssessmentReportDocx(document);
}

export async function renderSummaryReportPdf(
  document: AssessmentStructuredReportDocument,
): Promise<Uint8Array> {
  return renderAssessmentReportPdf(document);
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

async function renderAssessmentReportDocx(
  document: AssessmentStructuredReportDocument,
): Promise<Uint8Array> {
  const children: Array<Paragraph> = [createTitleParagraph(document.title)];

  for (const section of document.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        text: section.title,
        spacing: { before: 240, after: 120 },
      }),
    );

    if (section.description) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          text: section.description,
        }),
      );
    }

    for (const row of section.rows ?? []) {
      children.push(createKeyValueParagraph(row.label, toDisplayValue(row.value)));
    }

    for (const block of section.blocks ?? []) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          text: block.title,
          spacing: { before: 120, after: 80 },
        }),
      );

      for (const row of block.rows) {
        children.push(createKeyValueParagraph(row.label, toDisplayValue(row.value)));
      }
    }
  }

  return renderDocx(children);
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

async function renderAssessmentReportPdf(
  document: AssessmentStructuredReportDocument,
): Promise<Uint8Array> {
  return renderPdf((pdf) => {
    writePdfTitle(pdf, document.title);

    for (const section of document.sections) {
      writePdfSectionHeading(pdf, section.title);

      if (section.description) {
        pdf
          .fontSize(10)
          .font("Helvetica")
          .text(section.description, {
            width: pdf.page.width - pdf.page.margins.left - pdf.page.margins.right,
          });
        pdf.moveDown(0.2);
      }

      for (const row of section.rows ?? []) {
        writePdfKeyValue(pdf, row.label, toDisplayValue(row.value));
      }

      for (const block of section.blocks ?? []) {
        writePdfEntryHeading(pdf, block.title);
        for (const row of block.rows) {
          writePdfKeyValue(pdf, row.label, toDisplayValue(row.value));
        }
      }
    }
  });
}

function writePdfTitle(document: PDFKit.PDFDocument, value: string) {
  document.fontSize(20).font("Helvetica-Bold").text(value);
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
