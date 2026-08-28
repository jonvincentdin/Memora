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
  if (!q) return NextResponse.json({ notes: [], reviewers: [], quizzes: [] });

  const [notes, reviewers, quizzes] = await Promise.all([
    prisma.note.findMany({
      where: { ownerId: user.id, archivedAt: null, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { originalFilename: { contains: q, mode: "insensitive" } }] },
      select: { id: true, title: true, updatedAt: true },
      take: 10,
    }),
    prisma.reviewer.findMany({
      where: { ownerId: user.id, archivedAt: null, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
      select: { id: true, title: true, updatedAt: true },
      take: 10,
    }),
    prisma.quiz.findMany({
      where: { ownerId: user.id, archivedAt: null, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
      select: { id: true, title: true, updatedAt: true },
      take: 10,
    }),
  ]);

  return NextResponse.json({ notes, reviewers, quizzes });
});
