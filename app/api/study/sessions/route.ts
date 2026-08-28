import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const POST = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await prisma.studySession.create({ data: { userId: user.id } });
  return NextResponse.json({ session }, { status: 201 });
});

export const PATCH = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionId = (await request.json().catch(() => null))?.sessionId;
  if (typeof sessionId !== "string") return NextResponse.json({ error: "Missing session." }, { status: 400 });
  await prisma.studySession.updateMany({ where: { id: sessionId, userId: user.id }, data: { completedAt: new Date() } });
  return NextResponse.json({ success: true });
});
