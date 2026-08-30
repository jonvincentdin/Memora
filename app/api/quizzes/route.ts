import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { createQuizSchema } from "@/lib/validation/quiz";
import { canView } from "@/lib/permissions";
import { withApiErrorHandling } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quizzes = await prisma.quiz.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, description: true, mode: true, updatedAt: true, createdAt: true, questions: true },
  });

  return NextResponse.json({
    quizzes: quizzes.map((q) => ({ ...q, questionCount: Array.isArray(q.questions) ? q.questions.length : 0, questions: undefined })),
  });
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createQuizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid quiz." }, { status: 400 });
  }

  for (const id of parsed.data.noteIds) {
    if (!(await canView(user.id, "NOTE", id))) return NextResponse.json({ error: "One or more memories could not be found." }, { status: 404 });
  }
  for (const id of parsed.data.reviewerIds) {
    if (!(await canView(user.id, "REVIEWER", id))) return NextResponse.json({ error: "One or more reviewers could not be found." }, { status: 404 });
  }

  const quiz = await prisma.quiz.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      mode: parsed.data.mode,
      configuration: parsed.data.configuration,
      questions: parsed.data.questions,
      reviewerLinks: {
        create: parsed.data.reviewerIds.map((reviewerId) => ({ reviewerId })),
      },
    },
  });

  return NextResponse.json({ quiz }, { status: 201 });
});
