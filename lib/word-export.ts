import { AlignmentType, Document, Footer, HeadingLevel, Packer, PageBreak, PageNumber, Paragraph, TextRun } from "docx";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { formatCorrectAnswer } from "@/lib/quiz-grading";

const PAGE_MARGIN = 960;
const FONT = "Arial";

function footer(title: string) {
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Made with Memoria  |  ${title}  |  `, size: 16, color: "666666" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "666666" })] })] });
}

function baseDocument(title: string, children: Paragraph[]) {
  return new Document({
    creator: "Memoria",
    title,
    styles: { default: { document: { run: { font: FONT, size: 22, color: "141827" }, paragraph: { spacing: { after: 140, line: 300 } } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN } } }, footers: { default: footer(title) }, children }],
  });
}

function cleanInline(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1");
}

function markdownParagraphs(title: string, markdown: string) {
  const rows: Paragraph[] = [new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title, bold: true, size: 40, color: "1B1F3B" })] }), new Paragraph({ children: [new TextRun({ text: "Made with Memoria", italics: true, size: 18, color: "777777" })] })];
  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    if (!line) { rows.push(new Paragraph({})); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)/);
    if (heading) {
      const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
      rows.push(new Paragraph({ heading: levels[heading[1].length - 1], keepNext: true, children: [new TextRun({ text: cleanInline(heading[2]), bold: true, color: "1B1F3B" })] }));
    } else if (/^[-*]\s+/.test(line)) rows.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(cleanInline(line.replace(/^[-*]\s+/, "")))] }));
    else if (/^\d+\.\s+/.test(line)) rows.push(new Paragraph({ indent: { left: 240 }, children: [new TextRun(cleanInline(line))] }));
    else if (line.startsWith("> ")) rows.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: cleanInline(line.slice(2)), italics: true, color: "4A4F6A" })] }));
    else rows.push(new Paragraph({ children: [new TextRun(cleanInline(line))] }));
  }
  return rows;
}

async function downloadDocument(document: Document, filename: string) {
  const blob = await Packer.toBlob(document);
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url; anchor.download = `${sanitize(filename)}.docx`; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportMarkdownToWord(title: string, markdown: string) {
  await downloadDocument(baseDocument(title, markdownParagraphs(title, markdown)), title);
}

function options(question: QuizQuestion) {
  if (question.type === "multiple_choice" || question.type === "multiple_select") return question.choices.map((choice, index) => `${String.fromCharCode(65 + index)}. ${choice}`);
  if (question.type === "true_false") return ["A. True", "B. False"];
  if (question.type === "matching") return question.pairs.map((pair, index) => `${index + 1}. ${pair.left}  ____________________`);
  return ["Answer: ________________________________________________"];
}

export async function exportQuizToWord(title: string, questions: QuizQuestion[], metadata: { author?: string | null; mode?: string } = {}) {
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title, bold: true, size: 40, color: "1B1F3B" })] }),
    new Paragraph({ children: [new TextRun(`Memoria  |  ${new Date().toLocaleDateString()}  |  ${questions.length} questions  |  ${metadata.mode?.replace(/_/g, " ") ?? "Quiz / Exam"}`)] }),
    new Paragraph({ children: [new TextRun(`Author: ${metadata.author?.trim() || "Memoria user"}`)] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "QUESTIONS", bold: true })] }),
  ];
  questions.forEach((question, index) => {
    children.push(new Paragraph({ keepNext: true, children: [new TextRun({ text: `${index + 1}. ${question.question}`, bold: true })] }));
    for (const option of options(question)) children.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun(option)] }));
  });
  children.push(new Paragraph({ children: [new PageBreak()] }), new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "ANSWER KEY", bold: true })] }));
  questions.forEach((question, index) => {
    children.push(new Paragraph({ keepNext: true, children: [new TextRun({ text: `${index + 1}. ${question.question}`, bold: true })] }), new Paragraph({ children: [new TextRun({ text: "Correct Answer: ", bold: true }), new TextRun(formatCorrectAnswer(question))] }), new Paragraph({ children: [new TextRun({ text: "Explanation: ", bold: true }), new TextRun({ text: question.explanation?.trim() || "No detailed explanation was provided.", italics: true })] }));
  });
  await downloadDocument(baseDocument(title, children), title);
}

function sanitize(value: string) { return value.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "memoria-export"; }
