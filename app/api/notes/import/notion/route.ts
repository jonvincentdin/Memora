import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { importNotionPage, NotionImportError, isNotionConfigured } from "@/lib/imports/notion-import";
import { createNote } from "@/lib/notes-repo";
import { withApiErrorHandling } from "@/lib/api/handler";

// POST { url: string } — imports exactly the one Notion page the URL points
// to. See lib/imports/notion-import.ts for why this can never reach more
// than that single page.
export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isNotionConfigured()) {
    return NextResponse.json(
      { error: "Notion import isn't set up on this server yet. Ask the site owner to configure NOTION_API_KEY." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Paste a Notion page link first." }, { status: 400 });
  }

  try {
    const { title, content, hasImages } = await importNotionPage(url);
    const note = await createNote({
      ownerId: user.id,
      title,
      originalFilename: url,
      sourceType: "NOTION",
      sourceUrl: url,
      content,
    });
    return NextResponse.json(
      {
        note,
        status: "complete",
        notice: hasImages
          ? "This page contained images. Memora only imports text, so any images were skipped — only the written content came through."
          : undefined,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof NotionImportError) {
      return NextResponse.json({ error: err.message, status: "failed" }, { status: 422 });
    }
    throw err;
  }
});
