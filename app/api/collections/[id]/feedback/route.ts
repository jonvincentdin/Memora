import { NextResponse } from "next/server";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const DELETE = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user] = await Promise.all([context.params, requireUserOrNull()]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const feedbackId = new URL(request.url).searchParams.get("feedbackId");
  if (!feedbackId) return NextResponse.json({ error: "Missing feedback." }, { status: 400 });
  const result = await prisma.shareFeedback.deleteMany({ where: { id: feedbackId, collectionId: id, collection: { ownerId: user.id } } });
  if (!result.count) return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  return NextResponse.json({ success: true });
});
