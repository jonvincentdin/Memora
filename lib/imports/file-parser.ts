import { parseFrontmatter } from "@/lib/markdown-frontmatter";

export const SUPPORTED_EXTENSIONS = ["txt", "md", "pdf", "docx", "json"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? 10 * 1024 * 1024);

export class FileParseError extends Error {}

export interface ExtractedFile {
  text: string;
  extension: SupportedExtension;
  /** Present when the file carried its own title (frontmatter or a Memora JSON export) — prefer this over deriving one from the filename. */
  title?: string;
  description?: string;
  /**
   * True when the source file (PDF/DOCX) contains embedded images. Memora only
   * imports text, so the caller should surface a clear "images were skipped"
   * notice rather than silently dropping them.
   */
  hasImages?: boolean;
}

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

/**
 * Extracts plain text (and, where available, the original title/description)
 * from an uploaded note file. This is the single entry point for both the
 * authenticated import route and the guest (stateless) extraction endpoint.
 *
 * Security notes:
 * - Never trust the file extension alone; we also sniff magic bytes for PDF/DOCX.
 * - Enforces a max size before doing any parsing work.
 * - All parsing happens server-side; nothing here runs in the browser.
 */
export async function extractTextFromFile(file: File): Promise<ExtractedFile> {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new FileParseError(
      `This file is too large. Maximum upload size is ${(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`
    );
  }
  if (file.size === 0) {
    throw new FileParseError("This file appears to be empty.");
  }

  const extension = getExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(extension as SupportedExtension)) {
    throw new FileParseError(
      `Unsupported file type ".${extension || "unknown"}". Memora currently supports .md, .txt, .pdf, .docx, and Memora's own exported .json files.`
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === "pdf") {
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new FileParseError("This file isn't a valid PDF. Make sure it wasn't renamed from another format.");
    }
    const { text, hasImages } = await extractPdfText(buffer);
    return { text, extension: "pdf", hasImages };
  }

  if (extension === "docx") {
    // A .docx is a zip archive — the first two bytes are the local-file-header magic "PK".
    if (buffer.subarray(0, 2).toString("ascii") !== "PK") {
      throw new FileParseError("This file isn't a valid .docx. Make sure it wasn't renamed from another format.");
    }
    return await extractDocxText(buffer);
  }

  if (extension === "json") {
    return parseJsonImport(buffer);
  }

  // txt or md — both are just UTF-8 text. If it carries a Memora frontmatter
  // block (from a previous export), recover the original title/description
  // instead of falling back to a filename-derived guess.
  const raw = buffer.toString("utf-8").trim();
  if (!raw) {
    throw new FileParseError("This file appears to be empty.");
  }
  const { title, description, content } = parseFrontmatter(raw);
  if (!content.trim()) {
    throw new FileParseError("This file appears to be empty.");
  }
  return { text: content, extension: extension as "txt" | "md", title, description };
}

/**
 * Re-imports a file previously downloaded from Memora's own "Export as
 * JSON" button (memora-note-export / memora-reviewer-export format) when
 * possible, and otherwise falls back to a generic reader that pulls the
 * note text out of whatever shape of JSON was uploaded — see
 * `extractNoteTextFromJson` below.
 */
function parseJsonImport(buffer: Buffer): ExtractedFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(buffer.toString("utf-8"));
  } catch {
    throw new FileParseError("This .json file isn't valid JSON. Double-check it wasn't cut off or edited by hand.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new FileParseError("This .json file doesn't contain an object or array Memora can read notes from.");
  }

  const obj = parsed as Record<string, unknown>;
  const isMemoraExport = obj.format === "memora-note-export" || obj.format === "memora-reviewer-export";
  if (isMemoraExport && typeof obj.content === "string" && obj.content.trim()) {
    return {
      text: obj.content,
      extension: "json",
      title: typeof obj.title === "string" ? obj.title : undefined,
      description: typeof obj.description === "string" ? obj.description : undefined,
    };
  }

  // Generic JSON: read everything inside the file and pull out the note
  // content, preferring a "content"/"notes" field (however deeply the
  // caller nested it) so the import preview shows the actual notes rather
  // than raw JSON.
  const text = extractNoteTextFromJson(parsed);
  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title
      : typeof obj.name === "string" && obj.name.trim()
        ? obj.name
        : undefined;

  if (text) {
    return { text, extension: "json", title };
  }

  // Nothing recognizable — still let the import succeed rather than reject
  // it outright, but be honest that we couldn't find a "notes" field.
  return {
    text: "```json\n" + JSON.stringify(parsed, null, 2) + "\n```",
    extension: "json",
    title,
  };
}

/**
 * Walks a parsed JSON value looking for note text. Priority order per
 * object: "content" first (per Memora's own export shape), then "notes",
 * falling back through a few other common keys. Arrays are flattened and
 * joined with a section break so a JSON export containing multiple notes
 * still comes through as one readable document.
 */
function extractNoteTextFromJson(value: unknown, depth = 0): string | null {
  if (depth > 6) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractNoteTextFromJson(item, depth + 1))
      .filter((v): v is string => Boolean(v));
    return parts.length ? parts.join("\n\n---\n\n") : null;
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["content", "notes", "note", "body", "text", "markdown", "md"]) {
      if (key in obj) {
        const nested = extractNoteTextFromJson(obj[key], depth + 1);
        if (nested) return nested;
      }
    }
    return null;
  }

  return null;
}

async function extractPdfText(buffer: Buffer): Promise<{ text: string; hasImages: boolean }> {
  try {
    // pdf-parse is CommonJS; dynamic import keeps it out of the client bundle.
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    const text = result.text.trim();
    const hasImages = pdfContainsImages(buffer);
    if (!text) {
      throw new FileParseError(
        hasImages
          ? "This PDF looks like it's made of scanned pages or images rather than selectable text — Memora can't read text out of images yet, so there was nothing to import."
          : "We couldn't extract any text from this PDF. It may be a scanned image without a text layer."
      );
    }
    return { text, hasImages };
  } catch (err) {
    if (err instanceof FileParseError) throw err;
    throw new FileParseError("We couldn't read this file. Make sure it is a valid, uncorrupted PDF.");
  }
}

/** Cheap heuristic: PDF image XObjects are declared with "/Subtype /Image" in the object dictionary. */
function pdfContainsImages(buffer: Buffer): boolean {
  const sample = buffer.toString("latin1");
  return /\/Subtype\s*\/Image/.test(sample);
}

async function extractDocxText(buffer: Buffer): Promise<ExtractedFile> {
  try {
    // mammoth is CommonJS; dynamic import keeps it out of the client bundle.
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    if (!text) {
      throw new FileParseError("We couldn't find any text in this .docx file — it may be empty or image-only.");
    }
    // A .docx is a zip; embedded media is stored as separate entries under
    // word/media/. Their filenames appear as plain ASCII in the archive's
    // local file headers even though the file as a whole is compressed.
    const hasImages = buffer.toString("latin1").includes("word/media/");
    return { text, extension: "docx", hasImages };
  } catch (err) {
    if (err instanceof FileParseError) throw err;
    throw new FileParseError("We couldn't read this file. Make sure it is a valid, uncorrupted .docx document.");
  }
}
