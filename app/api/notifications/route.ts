import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, message: true, href: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
});

export const PATCH = withApiErrorHandling(async (request: Request) => { const user = await requireUserOrNull(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const body = await request.json().catch(() => null); await prisma.notification.updateMany({ where: { userId: user.id, readAt: null, ...(typeof body?.id === "string" ? { id: body.id } : {}) }, data: { readAt: new Date() } }); return NextResponse.json({ success: true }); });
