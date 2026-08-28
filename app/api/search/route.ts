import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { withApiErrorHandling } from "@/lib/api/handler";

// GET /api/search?q=... — searches the caller's notes, reviewers, and quizzes by title.
export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const recommended = searchParams.get("recommended") === "1";
  if (!q && !recommended) return NextResponse.json({ notes: [], reviewers: [], quizzes: [] });

  if (!q) {
    const [notes, reviewers, quizzes] = await Promise.all([
      prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null }, select: { id: true, title: true, updatedAt: true, isFavorite: true }, orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }], take: 4 }),
      prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null }, select: { id: true, title: true, updatedAt: true, isFavorite: true }, orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }], take: 4 }),
      prisma.quiz.findMany({ where: { ownerId: user.id, archivedAt: null }, select: { id: true, title: true, updatedAt: true, isFavorite: true }, orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }], take: 4 }),
    ]);
    return NextResponse.json({ notes, reviewers, quizzes, recommended: true });
  }

  const [notes, reviewers, quizzes] = await Promise.all([
    prisma.note.findMany({
      where: { ownerId: user.id, archivedAt: null, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { originalFilename: { contains: q, mode: "insensitive" } }] },
      select: { id: true, title: true, updatedAt: true, isFavorite: true },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
      take: 5,
    }),
    prisma.reviewer.findMany({
      where: { ownerId: user.id, archivedAt: null, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
      select: { id: true, title: true, updatedAt: true, isFavorite: true },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
      take: 5,
    }),
    prisma.quiz.findMany({
      where: { ownerId: user.id, archivedAt: null, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
      select: { id: true, title: true, updatedAt: true, isFavorite: true },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
      take: 5,
    }),
  ]);

  return NextResponse.json({ notes, reviewers, quizzes });
});
