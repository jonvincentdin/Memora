import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const schema = z.object({ action: z.enum(["logout_other", "continue"]), sessionId: z.string().min(1) });

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.sessionId !== user.sessionId) return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  if (parsed.data.action === "logout_other") await prisma.activeSession.deleteMany({ where: { userId: user.id, id: { not: parsed.data.sessionId } } });
  return NextResponse.json({ success: true });
});
