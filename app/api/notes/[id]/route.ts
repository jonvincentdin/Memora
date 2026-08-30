import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { updateNoteSchema } from "@/lib/validation/note";
import { canView, canEdit, isOwner, deleteSharesForResource } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { findNoteById, updateNote } from "@/lib/notes-repo";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { createResourceRevision } from "@/lib/revisions";
import { revalidatePath } from "next/cache";

export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canView(user.id, "NOTE", params.id);
  if (!allowed) return NextResponse.json({ error: "Memory not found." }, { status: 404 });

  const note = await findNoteById(params.id);
  if (!note) return NextResponse.json({ error: "Memory not found." }, { status: 404 });

  return NextResponse.json({ note });
});

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canEdit(user.id, "NOTE", params.id);
  if (!allowed) return NextResponse.json({ error: "Memory not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  const current = await findNoteById(params.id);
  if (!current) return NextResponse.json({ error: "Memory not found." }, { status: 404 });
  await createResourceRevision({ ownerId: current.ownerId, resourceType: "NOTE", resourceId: current.id, snapshot: { title: current.title, description: current.description ?? null, content: current.content }, autosave: request.headers.get("x-memora-autosave") === "1" });
  const note = await updateNote(params.id, parsed.data);

  revalidatePath("/notes");
  revalidatePath(`/notes/${params.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/search");

  return NextResponse.json({ note });
});

export const DELETE = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owns = await isOwner(user.id, "NOTE", params.id);
  if (!owns) return NextResponse.json({ error: "Memory not found." }, { status: 404 });

  await deleteSharesForResource("NOTE", params.id);
  await prisma.note.delete({ where: { id: params.id } });

  revalidatePath("/notes");
  revalidatePath("/dashboard");
  revalidatePath("/search");

  return NextResponse.json({ success: true });
});
