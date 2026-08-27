import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { canView } from "@/lib/permissions";
import { exportReviewerAsJson } from "@/lib/exports";
import { serializeWithFrontmatter } from "@/lib/markdown-frontmatter";
import { findReviewerById } from "@/lib/reviewers-repo";
import { withApiErrorHandling } from "@/lib/api/handler";

// GET /api/reviewers/export?id=...&format=md|json
export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const format = searchParams.get("format") === "md" ? "md" : "json";
  if (!id) return NextResponse.json({ error: "Missing reviewer id." }, { status: 400 });

  const allowed = await canView(user.id, "REVIEWER", id);
  if (!allowed) return NextResponse.json({ error: "Reviewer not found." }, { status: 404 });

  const reviewer = await findReviewerById(id);
  if (!reviewer) return NextResponse.json({ error: "Reviewer not found." }, { status: 404 });

  const filenameSafe = reviewer.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  if (format === "md") {
    const body = serializeWithFrontmatter(reviewer.title, reviewer.description, reviewer.content);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameSafe}.md"`,
      },
    });
  }

  // Compact (no pretty-print whitespace) — smaller file, still valid JSON.
  return new NextResponse(JSON.stringify(exportReviewerAsJson(reviewer)), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="memora-reviewer-${filenameSafe}-v1.json"`,
    },
  });
});
