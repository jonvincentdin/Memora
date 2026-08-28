import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation/auth";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { withApiErrorHandling } from "@/lib/api/handler";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { appUrl, emailDeliveryConfigured, sendTransactionalEmail } from "@/lib/email";

export const POST = withApiErrorHandling(async (request: Request) => {
  const ip = getClientIp(request.headers);
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid registration details." },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const requiresVerification = emailDeliveryConfigured();

  const [limited, existing, passwordHash] = await Promise.all([
    isRateLimited(`register:${ip}`),
    prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
    bcrypt.hash(password, 12),
  ]);
  if (limited) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  }
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      emailVerified: requiresVerification ? null : new Date(),
      settings: { create: {} },
    },
    select: { id: true, name: true, email: true },
  });

  if (requiresVerification) {
    const { token } = await issueAccountToken(user.id, "EMAIL_VERIFICATION", 24 * 60);
    const verifyUrl = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
    await sendTransactionalEmail({
      to: user.email,
      subject: "Verify your Memora email",
      text: `Verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
      html: `<p>Hello ${escapeHtml(user.name)},</p><p><a href="${verifyUrl}">Verify your Memora email</a>. This link expires in 24 hours.</p>`,
    });
  }

  return NextResponse.json({ user, requiresVerification }, { status: 201 });
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
