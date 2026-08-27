/**
 * A minimal YAML-like frontmatter block for exported Markdown files:
 *
 *   ---
 *   title: My Notes
 *   description: Optional one-liner
 *   ---
 *
 *   # actual content starts here
 *
 * This is what makes an exported .md file re-importable without losing the
 * original title/description — without it, re-importing a downloaded file
 * has nothing to go on but the filename, which is lossy (spaces become
 * dashes, casing gets flattened, etc.).
 *
 * Deliberately supports only single-line, unquoted-or-simple-quoted string
 * values for title/description — this is not a general YAML parser, just
 * enough structure for Memora's own round trip.
 */

export interface ParsedFrontmatter {
  title?: string;
  description?: string;
  content: string;
}

function escapeYamlValue(value: string): string {
  // Wrap in double quotes and escape embedded quotes/backslashes/newlines
  // whenever the value needs it, so simple values stay unquoted and clean.
  const needsQuoting = /["\n:#]/.test(value) || value.trim() !== value;
  if (!needsQuoting) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function unescapeYamlValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return trimmed;
}

/** Wraps Markdown content with a frontmatter header carrying its title/description. */
export function serializeWithFrontmatter(title: string, description: string | null | undefined, content: string): string {
  const lines = ["---", `title: ${escapeYamlValue(title)}`];
  if (description) lines.push(`description: ${escapeYamlValue(description)}`);
  lines.push("---", "", content.trim(), "");
  return lines.join("\n");
}

/**
 * Extracts a frontmatter block if present, returning the remaining content
 * either way. Content without frontmatter passes through unchanged.
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { content: raw };

  const [, frontmatterBlock, rest] = match;
  const result: ParsedFrontmatter = { content: rest.replace(/^\n+/, "") };

  for (const line of frontmatterBlock.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = unescapeYamlValue(line.slice(separatorIndex + 1));
    if (key === "title" && value) result.title = value;
    if (key === "description" && value) result.description = value;
  }

  return result;
}
