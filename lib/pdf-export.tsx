import { jsPDF } from "jspdf";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import type { QuizQuestion } from "@/lib/validation/quiz";

/**
 * PDF export renders the SAME HTML the app already shows on screen (via
 * MarkdownRenderer, using the app's real fonts and .memora-markdown CSS)
 * into an off-screen container, then rasterizes that with html2canvas
 * through jsPDF's .html() method.
 *
 * This replaced an earlier version that hand-parsed Markdown line-by-line
 * and positioned text manually with jsPDF's low-level text API. That
 * approach had two real bugs: it stripped markdown syntax to plain text
 * instead of applying real bold/italic styling (so "**word**" rendered as
 * unstyled "word", and any syntax it didn't handle leaked through as
 * literal characters), and jsPDF's built-in Helvetica font mis-measured
 * certain punctuation, producing visibly spaced-out text. Rendering real
 * HTML with the app's own fonts sidesteps both problems entirely.
 */

const CONTAINER_WIDTH_PX = 760;
const PDF_CONTENT_WIDTH_PT = 545; // A4 (595pt) minus ~24pt margins each side

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "memora-export";
}

/** Builds the off-screen container all PDF exports render into, then hands it to jsPDF, then cleans up. */
function renderToPdf(title: string, bodyHtml: string) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-10000px";
  container.style.width = `${CONTAINER_WIDTH_PX}px`;
  container.style.padding = "36px";
  container.style.background = "#ffffff";
  container.style.fontFamily = "var(--font-sans), Arial, sans-serif";
  container.style.color = "#1B1F3B";
  container.innerHTML = `
    <h1 style="font-family: var(--font-display), Georgia, serif; font-size: 26px; font-weight: 600; margin: 0 0 20px 0; padding-bottom: 14px; border-bottom: 1px solid #E4E1D8; color: #1B1F3B;">
      ${escapeHtml(title)}
    </h1>
    ${bodyHtml}
  `;
  document.body.appendChild(container);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.html(container, {
    x: 24,
    y: 24,
    width: PDF_CONTENT_WIDTH_PT,
    windowWidth: CONTAINER_WIDTH_PX,
    autoPaging: "text",
    html2canvas: { scale: PDF_CONTENT_WIDTH_PT / CONTAINER_WIDTH_PX, useCORS: true, backgroundColor: "#ffffff" },
    callback: (pdf) => {
      pdf.save(`${sanitizeFilename(title)}.pdf`);
      document.body.removeChild(container);
    },
  });
}

/** Exports Markdown content (a note or reviewer) to PDF, using the app's real Markdown rendering. */
export function exportMarkdownToPdf(title: string, markdown: string) {
  const bodyHtml = renderToStaticMarkup(<MarkdownRenderer content={markdown} />);
  renderToPdf(title, bodyHtml);
}

/** Exports a quiz's questions (and an answer key, when explanations exist) to PDF. */
export function exportQuizToPdf(title: string, questions: QuizQuestion[]) {
  const questionsHtml = questions
    .map((q, i) => {
      const choicesHtml =
        "choices" in q && q.choices
          ? `<ol type="A" style="margin: 8px 0 0 20px; padding: 0; font-size: 13px; color: #4A4F6A;">
              ${q.choices.map((c) => `<li style="margin-bottom: 4px;">${escapeHtml(c)}</li>`).join("")}
            </ol>`
          : "";
      return `
        <div style="margin-bottom: 20px; break-inside: avoid;">
          <p style="font-size: 14px; font-weight: 600; color: #1B1F3B; margin: 0;">${i + 1}. ${escapeHtml(q.question)}</p>
          ${choicesHtml}
        </div>
      `;
    })
    .join("");

  const explained = questions.filter((q) => q.explanation);
  const answerKeyHtml =
    explained.length > 0
      ? `
        <h2 style="font-family: var(--font-display), Georgia, serif; font-size: 20px; font-weight: 600; margin: 32px 0 16px 0; padding-top: 20px; border-top: 1px solid #E4E1D8; color: #1B1F3B;">
          Answer Key &amp; Explanations
        </h2>
        ${explained
          .map((q, i) => {
            const originalIndex = questions.indexOf(q);
            return `<p style="font-size: 13px; margin: 0 0 10px 0; color: #4A4F6A;"><strong style="color: #1B1F3B;">${originalIndex + 1}.</strong> ${escapeHtml(q.explanation!)}</p>`;
          })
          .join("")}
      `
      : "";

  renderToPdf(title, `<div style="font-size: 14px; line-height: 1.6;">${questionsHtml}</div>${answerKeyHtml}`);
}
