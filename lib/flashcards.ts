export interface Flashcard {
  front: string;
  back: string;
}

/**
 * Pulls flashcard-ready pairs out of Markdown reviewer content:
 * - Bullets/lines shaped like "**Term**: definition" or "Term: definition"
 * - Two-column GFM tables (assumed Term | Definition)
 * - Blockquote callouts, using the nearest preceding heading as the front
 *
 * This is a heuristic, not a full Markdown parse — it's good enough for the
 * common "term: definition" study-note shapes an AI reviewer tends to
 * produce, and degrades gracefully (returns nothing) rather than guessing
 * badly on prose paragraphs.
 */
export function extractFlashcardsFromMarkdown(markdown: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const lines = markdown.split("\n");
  let lastHeading = "";
  let inTable = false;
  let tableColumnCount = 0;
  let tableRowIndex = 0;

  const definitionLine = /^[-*]?\s*\*{0,2}([^:*]{2,80})\*{0,2}\s*:\s*(.+)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      inTable = false;
      continue;
    }

    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      lastHeading = headingMatch[1].trim();
      inTable = false;
      continue;
    }

    if (/^\|.*\|$/.test(line)) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      const isDivider = cells.every((c) => /^:?-+:?$/.test(c));
      if (isDivider) continue;

      if (!inTable) {
        inTable = true;
        tableColumnCount = cells.length;
        tableRowIndex = 0;
      } else {
        tableRowIndex += 1;
      }

      if (inTable && tableRowIndex > 0 && tableColumnCount === 2 && cells[0] && cells[1]) {
        cards.push({ front: cells[0], back: cells[1] });
      }
      continue;
    }
    inTable = false;

    if (line.startsWith(">")) {
      const text = line.replace(/^>\s?/, "");
      if (text) cards.push({ front: lastHeading || "Key point", back: text });
      continue;
    }

    const match = line.match(definitionLine);
    if (match) {
      const front = match[1].trim();
      const back = match[2].trim();
      if (front.length > 1 && back.length > 1) cards.push({ front, back });
    }
  }

  return cards;
}
