import { NextResponse } from "next/server";
import { consumeAccountCode } from "@/lib/auth/account-tokens";
import { prisma } from "@/lib/db";
import { acceptPendingInvites } from "@/lib/sharing/invites";
import { withApiErrorHandling } from "@/lib/api/handler";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the six-digit code sent to your email." }, { status: 400 });
  const email = parsed.data.email.toLowerCase().trim();
  if (await isRateLimited(`verify-email:${getClientIp(request.headers)}:${email}`, 8, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Request a new code and try again later." }, { status: 429 });
  }
  const user = await consumeAccountCode(email, parsed.data.code, "EMAIL_VERIFICATION");
  if (!user) return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  await acceptPendingInvites(user.id, user.email);
  return NextResponse.json({ success: true });
});
