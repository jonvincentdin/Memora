import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const schema = z.object({ reason: z.string().trim().max(500).optional() });

export const POST = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user, body] = await Promise.all([context.params, requireUserOrNull(), request.json().catch(() => ({}))]);
  if (!user) return NextResponse.json({ error: "Sign in to report comments." }, { status: 401 });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  const feedback = await prisma.shareFeedback.findUnique({ where: { id }, select: { id: true, authorUserId: true } });
  if (!feedback) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  if (feedback.authorUserId === user.id) return NextResponse.json({ error: "You cannot report your own comment." }, { status: 400 });
  await prisma.feedbackReport.upsert({ where: { feedbackId_userId: { feedbackId: id, userId: user.id } }, create: { feedbackId: id, userId: user.id, reason: parsed.data.reason }, update: { reason: parsed.data.reason } });
  return NextResponse.json({ success: true });
});
