import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const PATCH = withApiErrorHandling(async (request: Request) => { const user = await requireUserOrNull(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const body = await request.json().catch(() => null); await prisma.notification.updateMany({ where: { userId: user.id, readAt: null, ...(typeof body?.id === "string" ? { id: body.id } : {}) }, data: { readAt: new Date() } }); return NextResponse.json({ success: true }); });
