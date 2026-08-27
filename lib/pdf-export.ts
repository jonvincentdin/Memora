import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
export function exportMarkdownToPdf(title: string, markdown: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
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
    const lines: string[] = doc.splitTextToSize(stripInlineMarkdown(text), contentWidth - indent);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      doc.text(line, PAGE_MARGIN + indent, y);
      y += fontSize * 1.35;
    }
  }

  const lines = markdown.split("\n");
  let tableBuffer: string[][] | null = null;

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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(stripInlineMarkdown(title), PAGE_MARGIN, y);
  y += 30;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

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

  doc.save(`${sanitizeFilename(title)}.pdf`);
}

interface QuizQuestionForPdf {
  question: string;
  type: string;
  choices?: string[];
  explanation?: string;
}

/** Renders a quiz's questions (and optionally an answer key) to a downloadable PDF. */
export function exportQuizToPdf(title: string, questions: QuizQuestionForPdf[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, PAGE_MARGIN, y);
  y += 32;

  questions.forEach((q, i) => {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const qLines: string[] = doc.splitTextToSize(`${i + 1}. ${q.question}`, contentWidth);
    for (const line of qLines) {
      ensureSpace(16);
      doc.text(line, PAGE_MARGIN, y);
      y += 16;
    }

    if (q.choices) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      q.choices.forEach((choice, ci) => {
        ensureSpace(14);
        const letter = String.fromCharCode(65 + ci);
        const lines: string[] = doc.splitTextToSize(`${letter}. ${choice}`, contentWidth - 16);
        for (const line of lines) {
          ensureSpace(14);
          doc.text(line, PAGE_MARGIN + 16, y);
          y += 14;
        }
      });
    }
    y += 10;
  });

  doc.addPage();
  y = PAGE_MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Answer Key & Explanations", PAGE_MARGIN, y);
  y += 26;

  questions.forEach((q, i) => {
    if (!q.explanation) return;
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${i + 1}.`, PAGE_MARGIN, y);
    doc.setFont("helvetica", "normal");
    const lines: string[] = doc.splitTextToSize(q.explanation, contentWidth - 20);
    for (const line of lines) {
      ensureSpace(14);
      doc.text(line, PAGE_MARGIN + 20, y);
      y += 14;
    }
    y += 8;
  });

  doc.save(`${sanitizeFilename(title)}.pdf`);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "memora-export";
}
