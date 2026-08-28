import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const schema = z.object({ front: z.string().trim().min(1).max(2000), back: z.string().trim().min(1).max(10000) });

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user, body] = await Promise.all([context.params, requireUserOrNull(), request.json().catch(() => null)]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const result = await prisma.flashcard.updateMany({ where: { id, ownerId: user.id }, data: parsed.data });
  if (!result.count) return NextResponse.json({ error: "Flashcard not found." }, { status: 404 });
  const card = await prisma.flashcard.findUnique({ where: { id }, select: { id: true, front: true, back: true } });
  return NextResponse.json({ card });
});

export const DELETE = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user] = await Promise.all([context.params, requireUserOrNull()]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await prisma.flashcard.deleteMany({ where: { id, ownerId: user.id } });
  if (!result.count) return NextResponse.json({ error: "Flashcard not found." }, { status: 404 });
  return NextResponse.json({ success: true });
});
