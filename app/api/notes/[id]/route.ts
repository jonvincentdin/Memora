import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { updateNoteSchema } from "@/lib/validation/note";
import { canView, canEdit, isOwner, deleteSharesForResource } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { findNoteById, updateNote } from "@/lib/notes-repo";
import { withApiErrorHandling } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async (_request: Request, { params }: { params: { id: string } }) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canView(user.id, "NOTE", params.id);
  if (!allowed) return NextResponse.json({ error: "Note not found." }, { status: 404 });

  const note = await findNoteById(params.id);
  if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });

  return NextResponse.json({ note });
});

export const PATCH = withApiErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canEdit(user.id, "NOTE", params.id);
  if (!allowed) return NextResponse.json({ error: "Note not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  const note = await updateNote(params.id, parsed.data);

  return NextResponse.json({ note });
});

export const DELETE = withApiErrorHandling(async (_request: Request, { params }: { params: { id: string } }) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owns = await isOwner(user.id, "NOTE", params.id);
  if (!owns) return NextResponse.json({ error: "Note not found." }, { status: 404 });

  await deleteSharesForResource("NOTE", params.id);
  await prisma.note.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
});
