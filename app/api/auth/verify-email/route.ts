import { NextResponse } from "next/server";
import { consumeAccountToken } from "@/lib/auth/account-tokens";
import { prisma } from "@/lib/db";
import { acceptPendingInvites } from "@/lib/sharing/invites";
import { withApiErrorHandling } from "@/lib/api/handler";

export const POST = withApiErrorHandling(async (request: Request) => {
  const token = (await request.json().catch(() => null))?.token;
  if (typeof token !== "string") return NextResponse.json({ error: "Missing verification token." }, { status: 400 });
  const user = await consumeAccountToken(token, "EMAIL_VERIFICATION");
  if (!user) return NextResponse.json({ error: "That verification link is invalid or has expired." }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  await acceptPendingInvites(user.id, user.email);
  return NextResponse.json({ success: true });
});
