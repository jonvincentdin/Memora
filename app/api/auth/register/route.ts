import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation/auth";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { withApiErrorHandling } from "@/lib/api/handler";
import { issueAccountCode } from "@/lib/auth/account-tokens";
import { emailDeliveryConfigured, sendTransactionalEmail } from "@/lib/email";

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
    const { code } = await issueAccountCode(user.id, "EMAIL_VERIFICATION", 10);
    await sendTransactionalEmail({
      to: user.email,
      subject: `${code} is your Memoria verification code`,
      text: `Your Memoria verification code is ${code}.\n\nThis code expires in 10 minutes.`,
      html: `<p>Hello ${escapeHtml(user.name)},</p><p>Your Memoria verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes.</p>`,
    });
  }

  return NextResponse.json({ user, requiresVerification }, { status: 201 });
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
