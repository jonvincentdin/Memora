import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { createNoteSchema } from "@/lib/validation/note";
import { createNote } from "@/lib/notes-repo";
import { withApiErrorHandling } from "@/lib/api/handler";
import { revalidatePath } from "next/cache";

export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));

  const where = {
    ownerId: user.id,
    ...(search
      ? { OR: [{ title: { contains: search, mode: "insensitive" as const } }, { description: { contains: search, mode: "insensitive" as const } }] }
      : {}),
  };

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, title: true, description: true, sourceType: true, updatedAt: true, createdAt: true },
    }),
    prisma.note.count({ where }),
  ]);

  return NextResponse.json({ notes, total, page, pageSize });
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid memory." }, { status: 400 });
  }

  const note = await createNote({
    ownerId: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    content: parsed.data.content,
    sourceType: "MANUAL",
  });

  revalidatePath("/notes");
  revalidatePath("/dashboard");
  revalidatePath("/search");

  return NextResponse.json({ note }, { status: 201 });
});
