import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { extractTextFromFile, FileParseError } from "@/lib/imports/file-parser";
import { createNote } from "@/lib/notes-repo";
import { withApiErrorHandling } from "@/lib/api/handler";
import type { NoteSourceType } from "@prisma/client";

// Handles the "Upload File" tab of the import screen. Accepts multipart
// form-data with a single "file" field (.txt, .md, .pdf, .docx, or .json)
// and an optional "title" override.
export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  try {
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

    return NextResponse.json(
      {
        note,
        status: "complete",
        notice: hasImages
          ? "This file contained images. Memora only imports text, so any images were skipped — only the written content came through."
          : undefined,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof FileParseError) {
      return NextResponse.json({ error: err.message, status: "failed" }, { status: 422 });
    }
    throw err;
  }
});
