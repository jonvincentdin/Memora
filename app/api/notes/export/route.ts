import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { canView } from "@/lib/permissions";
import { exportNoteAsJson } from "@/lib/exports";
import { serializeWithFrontmatter } from "@/lib/markdown-frontmatter";
import { findNoteById } from "@/lib/notes-repo";
import { withApiErrorHandling } from "@/lib/api/handler";

// GET /api/notes/export?id=...&format=md|json
export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const format = searchParams.get("format") === "json" ? "json" : "md";
  if (!id) return NextResponse.json({ error: "Missing memory id." }, { status: 400 });

  const allowed = await canView(user.id, "NOTE", id);
  if (!allowed) return NextResponse.json({ error: "Memory not found." }, { status: 404 });

  const note = await findNoteById(id);
  if (!note) return NextResponse.json({ error: "Memory not found." }, { status: 404 });

  const filenameSafe = note.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  if (format === "json") {
    // Compact (no pretty-print whitespace) — smaller file, still valid JSON.
    const payload = JSON.stringify(exportNoteAsJson(note));
    return new NextResponse(payload, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="memoria-memory-${filenameSafe}-v1.json"`,
      },
    });
  }

  // Frontmatter carries the exact title/description through a re-import,
  // instead of the importer having to guess them back from the filename.
  const body = serializeWithFrontmatter(note.title, note.description, note.content);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameSafe}.md"`,
    },
  });
});
