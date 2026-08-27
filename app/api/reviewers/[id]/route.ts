import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { updateReviewerSchema } from "@/lib/validation/reviewer";
import { canView, canEdit, isOwner, deleteSharesForResource } from "@/lib/permissions";
import { findReviewerById, updateReviewer } from "@/lib/reviewers-repo";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canView(user.id, "REVIEWER", params.id);
  if (!allowed) return NextResponse.json({ error: "Reviewer not found." }, { status: 404 });

  const reviewer = await findReviewerById(params.id, {
    noteLinks: { include: { note: { select: { id: true, title: true } } } },
  });
  if (!reviewer) return NextResponse.json({ error: "Reviewer not found." }, { status: 404 });

  return NextResponse.json({ reviewer });
});

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canEdit(user.id, "REVIEWER", params.id);
  if (!allowed) return NextResponse.json({ error: "Reviewer not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateReviewerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  const reviewer = await updateReviewer(params.id, parsed.data);
  return NextResponse.json({ reviewer });
});

export const DELETE = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owns = await isOwner(user.id, "REVIEWER", params.id);
  if (!owns) return NextResponse.json({ error: "Reviewer not found." }, { status: 404 });

  await deleteSharesForResource("REVIEWER", params.id);
  await prisma.reviewer.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
});
