import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const PATCH = withApiErrorHandling(async () => { const user = await requireUserOrNull(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } }); return NextResponse.json({ success: true }); });
