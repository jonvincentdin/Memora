import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { withApiErrorHandling } from "@/lib/api/handler";
import { addCollectionItem, removeCollectionItem } from "@/lib/share-collections-repo";
import { z } from "zod";

const addSchema = z.object({
  resourceType: z.enum(["NOTE", "REVIEWER", "QUIZ"]),
  resourceId: z.string().min(1),
});

export const POST = withApiErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid item." }, { status: 400 });
  }

  try {
    const item = await addCollectionItem(user.id, params.id, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't add item." }, { status: 400 });
  }
});

export const DELETE = withApiErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "Missing itemId." }, { status: 400 });

  try {
    await removeCollectionItem(user.id, params.id, itemId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't remove item." }, { status: 400 });
  }
});
