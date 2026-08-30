import { NextResponse } from "next/server";
import { z } from "zod";
import { issueAccountCode } from "@/lib/auth/account-tokens";
import { prisma } from "@/lib/db";
import { emailDeliveryConfigured, sendTransactionalEmail } from "@/lib/email";
import { withApiErrorHandling } from "@/lib/api/handler";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export const POST = withApiErrorHandling(async (request: Request) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email.toLowerCase().trim();

  if (await isRateLimited(`resend-verification:${getClientIp(request.headers)}:${email}`, 3, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many code requests. Try again in 15 minutes." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, emailVerified: true } });
  if (user && !user.emailVerified && emailDeliveryConfigured()) {
    const { code } = await issueAccountCode(user.id, "EMAIL_VERIFICATION", 10);
    await sendTransactionalEmail({
      to: user.email,
      subject: `${code} is your new Memoria verification code`,
      text: `Your new Memoria verification code is ${code}.\n\nThis code expires in 10 minutes.`,
      html: `<p>Hello ${escapeHtml(user.name)},</p><p>Your new Memoria verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes.</p>`,
    });
  }

  return NextResponse.json({ success: true });
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
