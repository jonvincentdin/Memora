import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { saveAttemptSchema } from "@/lib/validation/quiz";

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string; attemptId: string }>) => {
  const [params, user, body] = await Promise.all([context.params, requireUserOrNull(), request.json().catch(() => null)]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = saveAttemptSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid answers." }, { status: 400 });
  const attempt = await prisma.quizAttempt.findFirst({ where: { id: params.attemptId, quizId: params.id, userId: user.id } });
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") return NextResponse.json({ error: "This attempt is no longer active." }, { status: 409 });
  if (attempt.deadline && attempt.deadline <= new Date()) {
    await prisma.quizAttempt.update({ where: { id: attempt.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Time expired." }, { status: 410 });
  }
  const updated = await prisma.quizAttempt.update({ where: { id: attempt.id }, data: { answers: parsed.data.answers as Prisma.InputJsonValue, flagged: parsed.data.flagged as Prisma.InputJsonValue } });
  return NextResponse.json({ attempt: updated });
});
