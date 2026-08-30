import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { createReviewerSchema } from "@/lib/validation/reviewer";
import { canView } from "@/lib/permissions";
import { createReviewer } from "@/lib/reviewers-repo";
import { withApiErrorHandling } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reviewers = await prisma.reviewer.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, description: true, style: true, updatedAt: true, createdAt: true },
  });

  return NextResponse.json({ reviewers });
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createReviewerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid reviewer." }, { status: 400 });
  }

  for (const noteId of parsed.data.noteIds) {
    const allowed = await canView(user.id, "NOTE", noteId);
    if (!allowed) return NextResponse.json({ error: "One or more source memories could not be found." }, { status: 404 });
  }

  const reviewer = await createReviewer({
    ownerId: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    style: parsed.data.style,
    content: parsed.data.content,
    noteIds: parsed.data.noteIds,
  });

  return NextResponse.json({ reviewer }, { status: 201 });
});
