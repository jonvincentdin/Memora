import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { extractTextFromFile, FileParseError } from "@/lib/imports/file-parser";
import { createNote } from "@/lib/notes-repo";
import { withApiErrorHandling } from "@/lib/api/handler";
import type { NoteSourceType } from "@prisma/client";

// Handles the "Upload File" tab of the import screen. Accepts multipart
// form-data with up to 20 "file" fields (.txt, .md, .pdf, .docx, or .json)
// and an optional "title" override.
export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const files = (form?.getAll("file") ?? []).filter((value): value is File => value instanceof File).slice(0, 20);
  if (!files.length) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  if (files.reduce((sum, file) => sum + file.size, 0) > 25 * 1024 * 1024) return NextResponse.json({ error: "Batch uploads are limited to 25 MB total." }, { status: 413 });

  const notes = [];
  const errors: Array<{ filename: string; error: string }> = [];
  let hasAnyImages = false;
  for (const file of files) try {
    const { text, extension, title: recoveredTitle, description, hasImages } = await extractTextFromFile(file);
    const titleOverride = form?.get("title");
    const title =
      typeof titleOverride === "string" && titleOverride.trim()
        ? titleOverride.trim()
        : recoveredTitle || file.name.replace(/\.[^/.]+$/, "");

    const sourceType: NoteSourceType =
      extension === "pdf"
        ? "PDF"
        : extension === "docx"
          ? "DOCX"
          : extension === "txt"
            ? "TXT"
            : extension === "json"
              ? "MANUAL"
              : "MARKDOWN";

    const note = await createNote({
      ownerId: user.id,
      title,
      description,
      originalFilename: file.name,
      sourceType,
      fileExtension: extension,
      content: text,
    });
    notes.push(note);
    hasAnyImages ||= Boolean(hasImages);
  } catch (err) {
    if (err instanceof FileParseError) {
      errors.push({ filename: file.name, error: err.message });
      continue;
    }
    throw err;
  }
  if (!notes.length) return NextResponse.json({ error: errors[0]?.error ?? "No files could be imported.", errors, status: "failed" }, { status: 422 });
  return NextResponse.json({ note: notes[0], notes, errors, status: errors.length ? "partial" : "complete", notice: hasAnyImages ? "Some files contained images. Only their text was imported." : undefined }, { status: 201 });
});
