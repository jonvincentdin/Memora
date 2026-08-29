import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { formatCorrectAnswer } from "@/lib/quiz-grading";

const PAGE_MARGIN = 48;
const LINE_HEIGHT = 16;

/**
 * Renders a Markdown string into a downloadable PDF entirely client-side —
 * no server round trip, so this works the same for guest (unsaved) content
 * as it does for saved notes/reviewers.
 *
 * This is a lightweight structural renderer (headings, paragraphs, lists,
 * blockquotes, and GFM tables), not a full Markdown-to-PDF engine — inline
 * emphasis such as bold and italic markers is stripped to plain text rather
 * than styled, which keeps this dependency-light and reliable across
 * AI-generated output.
 */
export function buildMarkdownPdf(title: string, markdown: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  function startPage() {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setTextColor(20, 24, 39);
  }

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      startPage();
      y = PAGE_MARGIN;
    }
  }

  function stripInlineMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1");
  }

  function writeParagraph(text: string, fontSize: number, style: "normal" | "bold" | "italic" = "normal", indent = 0) {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    doc.setTextColor(20, 24, 39);
    const lines: string[] = doc.splitTextToSize(stripInlineMarkdown(text), contentWidth - indent);
    const blockHeight = lines.length * fontSize * 1.35;
    if (blockHeight <= pageHeight - PAGE_MARGIN * 2) ensureSpace(blockHeight);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      doc.text(line, PAGE_MARGIN + indent, y);
      y += fontSize * 1.35;
    }
  }

  const lines = markdown.split("\n");
  let tableBuffer: string[][] | null = null;

  function estimatedLineHeight(rawLine: string): number {
    const line = rawLine.trimEnd();
    if (!line.trim()) return 6;
    let size = 11;
    let indent = 0;
    if (line.startsWith("# ")) size = 18;
    else if (line.startsWith("## ")) size = 15;
    else if (line.startsWith("### ")) size = 13;
    else if (line.startsWith("#### ")) size = 12;
    else if (line.startsWith("> ")) indent = 16;
    else if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) indent = 12;
    const text = line.replace(/^#{1,4}\s+/, "").replace(/^>\s+/, "");
    const wrapped = doc.splitTextToSize(stripInlineMarkdown(text), contentWidth - indent) as string[];
    return Math.max(1, wrapped.length) * size * 1.35;
  }

  function flushTable() {
    if (!tableBuffer || tableBuffer.length === 0) return;
    const [header, , ...rows] = tableBuffer; // row 1 is the "---|---" divider
    ensureSpace(60);
    autoTable(doc, {
      startY: y,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [header],
      body: rows,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [27, 31, 59] },
      didDrawPage: () => {
        y = PAGE_MARGIN;
      },
    });
    // @ts-expect-error jspdf-autotable augments doc with lastAutoTable at runtime
    y = doc.lastAutoTable.finalY + 16;
    tableBuffer = null;
  }

  startPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(stripInlineMarkdown(title), PAGE_MARGIN, y);
  y += 30;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trimEnd();

    // Keep ordinary lesson sections together when they fit on one page, so
    // headings and the last bullet do not become isolated page orphans.
    if (/^#{1,4}\s+/.test(line)) {
      let sectionHeight = 0;
      for (let next = index; next < lines.length; next += 1) {
        if (next > index && /^#{1,4}\s+/.test(lines[next])) break;
        if (/^\|.*\|$/.test(lines[next].trim())) break;
        sectionHeight += estimatedLineHeight(lines[next]);
      }
      if (sectionHeight <= pageHeight - PAGE_MARGIN * 2) ensureSpace(sectionHeight);
    }

    if (/^\|.*\|$/.test(line.trim())) {
      const cells = line.trim().slice(1, -1).split("|").map((c) => c.trim());
      if (!tableBuffer) tableBuffer = [];
      tableBuffer.push(cells);
      continue;
    } else if (tableBuffer) {
      flushTable();
    }

    if (!line.trim()) {
      y += 6;
      continue;
    }

    if (line.startsWith("# ")) writeParagraph(line.slice(2), 18, "bold");
    else if (line.startsWith("## ")) writeParagraph(line.slice(3), 15, "bold");
    else if (line.startsWith("### ")) writeParagraph(line.slice(4), 13, "bold");
    else if (line.startsWith("#### ")) writeParagraph(line.slice(5), 12, "bold");
    else if (line.startsWith("> ")) writeParagraph(line.slice(2), 11, "italic", 16);
    else if (/^[-*]\s+/.test(line)) writeParagraph(`•  ${line.replace(/^[-*]\s+/, "")}`, 11, "normal", 12);
    else if (/^\d+\.\s+/.test(line)) writeParagraph(line, 11, "normal", 12);
    else writeParagraph(line, 11, "normal");
  }
  flushTable();

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(`Made with Memoria  |  ${title}`, PAGE_MARGIN, pageHeight - 20);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 20, { align: "right" });
  }

  return doc;
}

export function exportMarkdownToPdf(title: string, markdown: string) {
  buildMarkdownPdf(title, markdown).save(`${sanitizeFilename(title)}.pdf`);
}

export interface QuizExportMetadata {
  author?: string | null;
  mode?: string;
  date?: Date;
}

/**
 * Renders a print-first quiz/exam with explicit black text on white pages.
 * Drawing text directly avoids browser theme/CSS and html2canvas visibility
 * bugs that previously produced blank or dark exports.
 */
export function exportQuizToPdf(title: string, questions: QuizQuestion[], metadata: QuizExportMetadata = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  function startPage() {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setTextColor(20, 24, 39);
  }

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      startPage();
      y = PAGE_MARGIN;
    }
  }

  function writeWrapped(
    text: string,
    options: { size?: number; style?: "normal" | "bold" | "italic"; indent?: number; gapAfter?: number } = {}
  ) {
    const size = options.size ?? 11;
    const indent = options.indent ?? 0;
    const lineHeight = size * 1.35;
    doc.setFont("helvetica", options.style ?? "normal");
    doc.setFontSize(size);
    doc.setTextColor(20, 24, 39);
    const lines = doc.splitTextToSize(text || " ", contentWidth - indent) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, PAGE_MARGIN + indent, y);
      y += lineHeight;
    }
    y += options.gapAfter ?? 0;
  }

  function questionOptions(question: QuizQuestion): string[] {
    if (question.type === "multiple_choice" || question.type === "multiple_select") {
      return question.choices.map((choice, index) => `${String.fromCharCode(65 + index)}. ${choice}`);
    }
    if (question.type === "true_false") return ["A. True", "B. False"];
    if (question.type === "matching") return question.pairs.map((pair, index) => `${index + 1}. ${pair.left}  ____________________`);
    return ["Answer: ________________________________________________"];
  }

  startPage();

  // 1. Header
  doc.setFillColor(27, 31, 59);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("MEMORIA  |  STUDY & ASSESSMENT", PAGE_MARGIN, 22);
  y = 62;
  writeWrapped(title, { size: 22, style: "bold", gapAfter: 8 });

  const exportDate = (metadata.date ?? new Date()).toLocaleDateString();
  const mode = metadata.mode ? metadata.mode.replace(/_/g, " ") : "Quiz / Exam";
  writeWrapped(`Date: ${exportDate}    |    Questions: ${questions.length}    |    Type: ${mode}`, { size: 9, gapAfter: 3 });
  writeWrapped(`Author: ${metadata.author?.trim() || "Memoria user"}`, { size: 9, gapAfter: 10 });
  doc.setDrawColor(190, 190, 190);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 22;

  // 2. Questions
  writeWrapped("QUESTIONS", { size: 14, style: "bold", gapAfter: 12 });

  questions.forEach((q, i) => {
    ensureSpace(54);
    writeWrapped(`${i + 1}. ${q.question}`, { size: 11, style: "bold", gapAfter: 5 });
    for (const option of questionOptions(q)) {
      writeWrapped(option, { size: 10, indent: 18, gapAfter: 2 });
    }
    y += 10;
  });

  // 3. Answer key at the end
  doc.addPage();
  startPage();
  y = PAGE_MARGIN;
  writeWrapped("ANSWER KEY", { size: 16, style: "bold", gapAfter: 14 });

  questions.forEach((q, i) => {
    ensureSpace(58);
    writeWrapped(`${i + 1}. ${q.question}`, { size: 11, style: "bold", gapAfter: 4 });
    writeWrapped(`Correct Answer: ${formatCorrectAnswer(q)}`, { size: 10, gapAfter: 3 });
    writeWrapped(`Explanation: ${q.explanation?.trim() || "No detailed explanation was provided."}`, {
      size: 10,
      style: "italic",
      gapAfter: 12,
    });
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(`Made with Memoria  |  ${title}`, PAGE_MARGIN, pageHeight - 20);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 20, { align: "right" });
  }

  doc.save(`${sanitizeFilename(title)}.pdf`);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "memoria-export";
}
