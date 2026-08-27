import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { canView } from "@/lib/permissions";
import { exportQuizAsTxt, exportQuizAsJson } from "@/lib/exports";
import { withApiErrorHandling } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const format = searchParams.get("format") === "txt" ? "txt" : "json";
  if (!id) return NextResponse.json({ error: "Missing quiz id." }, { status: 400 });

  const allowed = await canView(user.id, "QUIZ", id);
  if (!allowed) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const filenameSafe = quiz.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  if (format === "txt") {
    return new NextResponse(exportQuizAsTxt(quiz), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameSafe}.txt"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(exportQuizAsJson(quiz), null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="memora-quiz-${filenameSafe}-v1.json"`,
    },
  });
});
