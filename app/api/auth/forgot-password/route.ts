import { NextResponse } from "next/server";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { appUrl, sendTransactionalEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { withApiErrorHandling } from "@/lib/api/handler";

export const POST = withApiErrorHandling(async (request: Request) => {
  if (await isRateLimited(`forgot-password:${getClientIp(request.headers)}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() }, select: { id: true, email: true, name: true } });
  if (user) {
    const { token } = await issueAccountToken(user.id, "PASSWORD_RESET", 30);
    const resetUrl = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
    await sendTransactionalEmail({
      to: user.email,
      subject: "Reset your Memoria password",
      text: `Reset your password: ${resetUrl}\n\nThis link expires in 30 minutes.`,
      html: `<p>Hello ${escapeHtml(user.name)},</p><p><a href="${resetUrl}">Reset your Memoria password</a>. This link expires in 30 minutes.</p>`,
    });
  }
  return NextResponse.json({ success: true });
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
