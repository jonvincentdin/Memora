import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findNoteById, createNote } from "@/lib/notes-repo";
import { findReviewerById, createReviewer } from "@/lib/reviewers-repo";
import { Prisma } from "@prisma/client";

const schema = z.object({
  resourceType: z.enum(["NOTE", "REVIEWER", "QUIZ"]),
  resourceIds: z.array(z.string()).min(1).max(100),
  action: z.enum(["archive", "restore", "favorite", "unfavorite", "duplicate"]),
});

export const PATCH = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid action." }, { status: 400 });
  const { resourceType, resourceIds, action } = parsed.data;
  const ownerFilter = { id: { in: resourceIds }, ownerId: user.id };

  if (action === "archive" || action === "restore" || action === "favorite" || action === "unfavorite") {
    const data = action === "archive" ? { archivedAt: new Date() } : action === "restore" ? { archivedAt: null } : { isFavorite: action === "favorite" };
    const result = resourceType === "NOTE" ? await prisma.note.updateMany({ where: ownerFilter, data })
      : resourceType === "REVIEWER" ? await prisma.reviewer.updateMany({ where: ownerFilter, data })
      : await prisma.quiz.updateMany({ where: ownerFilter, data });
    return NextResponse.json({ updated: result.count });
  }

  const id = resourceIds[0];
  if (resourceType === "NOTE") {
    const source = await findNoteById(id);
    if (!source || source.ownerId !== user.id) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    const copy = await createNote({ ownerId: user.id, title: `${source.title} (copy)`, description: source.description ?? undefined, content: source.content, sourceType: "MANUAL" });
    return NextResponse.json({ created: { id: copy.id } });
  }
  if (resourceType === "REVIEWER") {
    const source = await findReviewerById(id, { noteLinks: true });
    if (!source || source.ownerId !== user.id) return NextResponse.json({ error: "Reviewer not found." }, { status: 404 });
    const links = source.noteLinks as Array<{ noteId: string }>;
    const copy = await createReviewer({ ownerId: user.id, title: `${source.title} (copy)`, description: source.description ?? undefined, content: source.content, style: source.style, noteIds: links.map((link) => link.noteId) });
    return NextResponse.json({ created: { id: copy.id } });
  }
  const source = await prisma.quiz.findFirst({ where: { id, ownerId: user.id }, include: { reviewerLinks: true } });
  if (!source) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  const copy = await prisma.quiz.create({ data: { ownerId: user.id, title: `${source.title} (copy)`, description: source.description, mode: source.mode, configuration: source.configuration as Prisma.InputJsonValue, questions: source.questions as Prisma.InputJsonValue, reviewerLinks: { create: source.reviewerLinks.map((link) => ({ reviewerId: link.reviewerId })) } } });
  return NextResponse.json({ created: { id: copy.id } });
});
