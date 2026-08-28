import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { scheduleReview } from "@/lib/spaced-repetition";

const schema = z.object({ grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]), sessionId: z.string().optional() });

export const POST = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user, body] = await Promise.all([context.params, requireUserOrNull(), request.json().catch(() => null)]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a review grade." }, { status: 400 });
  const card = await prisma.flashcard.findFirst({ where: { id, ownerId: user.id }, select: { id: true } });
  if (!card) return NextResponse.json({ error: "Flashcard not found." }, { status: 404 });
  const current = await prisma.flashcardProgress.findUnique({ where: { userId_flashcardId: { userId: user.id, flashcardId: id } } });
  const next = scheduleReview(current ?? { intervalDays: 0, easeFactor: 2.5, repetitions: 0, lapses: 0 }, parsed.data.grade);
  const [progress] = await prisma.$transaction([
    prisma.flashcardProgress.upsert({ where: { userId_flashcardId: { userId: user.id, flashcardId: id } }, create: { userId: user.id, flashcardId: id, ...next }, update: next }),
    prisma.flashcardReview.create({ data: { userId: user.id, flashcardId: id, grade: parsed.data.grade } }),
    ...(parsed.data.sessionId ? [prisma.studySession.updateMany({ where: { id: parsed.data.sessionId, userId: user.id, completedAt: null }, data: { reviewed: { increment: 1 }, correct: parsed.data.grade >= 3 ? { increment: 1 } : undefined } })] : []),
  ]);
  return NextResponse.json({ progress });
});
