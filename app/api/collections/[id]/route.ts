import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { withApiErrorHandling } from "@/lib/api/handler";
import { findCollectionForOwner, updateCollection, deleteCollection } from "@/lib/share-collections-repo";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  isPublished: z.boolean().optional(),
});

export const GET = withApiErrorHandling(async (_request: Request, { params }: { params: { id: string } }) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collection = await findCollectionForOwner(user.id, params.id);
  if (!collection) return NextResponse.json({ error: "Collection not found." }, { status: 404 });

  return NextResponse.json({ collection });
});

export const PATCH = withApiErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  try {
    const collection = await updateCollection(user.id, params.id, parsed.data);
    return NextResponse.json({ collection });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed." }, { status: 404 });
  }
});

export const DELETE = withApiErrorHandling(async (_request: Request, { params }: { params: { id: string } }) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteCollection(user.id, params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Delete failed." }, { status: 404 });
  }
});
