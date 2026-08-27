import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { canView, isOwner, deleteSharesForResource } from "@/lib/permissions";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canView(user.id, "QUIZ", params.id);
  if (!allowed) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  return NextResponse.json({ quiz });
});

export const DELETE = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owns = await isOwner(user.id, "QUIZ", params.id);
  if (!owns) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  await deleteSharesForResource("QUIZ", params.id);
  await prisma.quiz.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
});
