import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/permissions";
import { updateNote } from "@/lib/notes-repo";
import { updateReviewer } from "@/lib/reviewers-repo";
import { findNoteById } from "@/lib/notes-repo";
import { findReviewerById } from "@/lib/reviewers-repo";
import { createResourceRevision } from "@/lib/revisions";

const resourceTypeSchema = z.enum(["NOTE", "REVIEWER", "QUIZ"]);

export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const type = resourceTypeSchema.safeParse(url.searchParams.get("resourceType"));
  const resourceId = url.searchParams.get("resourceId");
  if (!type.success || !resourceId) return NextResponse.json({ error: "Invalid resource." }, { status: 400 });
  if (!(await isOwner(user.id, type.data, resourceId))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const revisions = await prisma.resourceRevision.findMany({ where: { ownerId: user.id, resourceType: type.data, resourceId }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, createdAt: true, snapshot: true } });
  return NextResponse.json({ revisions });
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const revisionId = (await request.json().catch(() => null))?.revisionId;
  if (typeof revisionId !== "string") return NextResponse.json({ error: "Missing revision." }, { status: 400 });
  const revision = await prisma.resourceRevision.findFirst({ where: { id: revisionId, ownerId: user.id } });
  if (!revision) return NextResponse.json({ error: "Revision not found." }, { status: 404 });
  const snapshot = revision.snapshot as Record<string, unknown>;
  const data = { title: typeof snapshot.title === "string" ? snapshot.title : undefined, description: typeof snapshot.description === "string" ? snapshot.description : undefined, content: typeof snapshot.content === "string" ? snapshot.content : undefined };
  if (revision.resourceType === "NOTE") {
    const current = await findNoteById(revision.resourceId);
    if (!current) return NextResponse.json({ error: "Memory not found." }, { status: 404 });
    await createResourceRevision({ ownerId: user.id, resourceType: "NOTE", resourceId: current.id, snapshot: { title: current.title, description: current.description ?? null, content: current.content } });
    await updateNote(revision.resourceId, data);
  } else if (revision.resourceType === "REVIEWER") {
    const current = await findReviewerById(revision.resourceId);
    if (!current) return NextResponse.json({ error: "Reviewer not found." }, { status: 404 });
    await createResourceRevision({ ownerId: user.id, resourceType: "REVIEWER", resourceId: current.id, snapshot: { title: current.title, description: current.description ?? null, content: current.content } });
    await updateReviewer(revision.resourceId, data);
  }
  else return NextResponse.json({ error: "Quiz revision restore is not available yet." }, { status: 400 });
  return NextResponse.json({ success: true });
});
