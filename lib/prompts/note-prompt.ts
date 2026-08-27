export type ProcessingStyle = "preserve" | "balanced" | "condensed" | "exam_focused";

export const PROCESSING_STYLE_LABELS: Record<ProcessingStyle, string> = {
  preserve: "Preserve — keep almost everything, just improve structure",
  balanced: "Balanced — clean and organize, remove obvious redundancy",
  condensed: "Condensed — shorter reviewer, keep only what matters",
  exam_focused: "Exam Focused — prioritize concepts likely to be tested",
};

const STYLE_INSTRUCTIONS: Record<ProcessingStyle, string> = {
  preserve:
    "Keep nearly all of the original information. Only fix formatting, structure, and organization. Do not shorten or remove content.",
  balanced:
    "Clean up and organize the material. You may remove obvious redundancy and filler, but keep every distinct fact, term, and idea.",
  condensed:
    "Produce a noticeably shorter reviewer. Keep only the information that is important to understand and remember; drop repetition and minor detail.",
  exam_focused:
    "Prioritize the concepts, definitions, and facts that are most likely to appear on a test. De-emphasize incidental detail that is unlikely to be assessed.",
};

interface NoteForPrompt {
  title: string;
  content: string;
}

/**
 * Builds the "Prepare Notes for Memora" prompt. The user pastes this
 * (or the downloaded source package) into Claude or another AI assistant;
 * Memora never calls an AI API itself.
 *
 * Output is plain Markdown (GitHub-flavored — tables, headings, bold, lists),
 * not JSON. Markdown is dramatically more reliable for a model to produce
 * correctly than a nested JSON block schema, and Memora renders it directly
 * with full typography, so nothing is lost by asking for it this way.
 */
export function buildNoteReformatPrompt(notes: NoteForPrompt[], style: ProcessingStyle): string {
  const sourceBlock = notes
    .map(
      (note, i) =>
        `--- SOURCE ${i + 1}: ${note.title} ---\n${note.content.trim()}\n--- END SOURCE ${i + 1} ---`
    )
    .join("\n\n");

  return `You are helping convert raw study notes into a clean, well-organized study reviewer.

TASK
Reformat the study material below into clean, organized Markdown. ${STYLE_INSTRUCTIONS[style]}

RULES
- Preserve all factual information: terminology, names, dates, numbers, and technical terms must stay accurate.
- Do not invent information that is not present in the source material.
- Do not remove information that is clearly important, even if it seems minor.
- If something in the source is unclear, illegible, or ambiguous, mark it as [UNCLEAR: ...] instead of guessing or inventing a replacement.
- Organize the content into logical topics using headings and subheadings.

FORMATTING GUIDE — use standard GitHub-flavored Markdown:
- "# Title" for the reviewer's main title (use exactly one).
- "## Section" / "### Subsection" for topic headings.
- "**bold**" for key terms, "*italics*" for emphasis.
- "- item" for bullet lists, "1. item" for numbered/ordered steps.
- Markdown tables for any structured comparison, e.g.:
  | Term | Definition |
  |------|------------|
  | Mitosis | Cell division producing two identical daughter cells |
- "> blockquote" for a definition, callout, or important note you want to stand out.
- Triple-backtick fenced code blocks only for actual code/formulas that need monospacing.

OUTPUT FORMAT
Return ONLY the Markdown document itself — no JSON, no explanation, no preamble like "Here's the reformatted notes:", and do NOT wrap the whole thing in a \`\`\`markdown code fence. Just output the Markdown text directly, starting with the "# Title" heading.

SOURCE MATERIAL
${sourceBlock}

Return only the Markdown document described above.`;
}

/**
 * Builds the full exportable source package: readable note contents with
 * metadata and separators, followed by the AI instruction block. This is
 * what gets downloaded as memora-source.txt.
 */
export function buildSourcePackage(
  notes: (NoteForPrompt & { id: string; sourceType: string; updatedAt: Date })[],
  style: ProcessingStyle
): string {
  const header = `MEMORA SOURCE PACKAGE\nGenerated ${new Date().toISOString()}\n${notes.length} note(s) included\n`;

  const body = notes
    .map((note, i) => {
      return [
        "==============================",
        `NOTE ${i + 1}: ${note.title}`,
        "==============================",
        `Source type: ${note.sourceType}`,
        `Last updated: ${note.updatedAt.toISOString()}`,
        "",
        note.content.trim(),
        "",
      ].join("\n");
    })
    .join("\n");

  const instructions = [
    "==============================",
    "MEMORA AI INSTRUCTIONS",
    "==============================",
    `Convert the study material above into a clean Markdown reviewer.`,
    `Processing style: ${PROCESSING_STYLE_LABELS[style]}`,
    STYLE_INSTRUCTIONS[style],
    "",
    "Return ONLY the Markdown document — headings, bold key terms, bullet/numbered lists, and Markdown tables for comparisons. Do not wrap it in a code fence.",
  ].join("\n");

  return `${header}\n${body}\n${instructions}\n`;
}
