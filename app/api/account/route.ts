import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { prisma } from "@/lib/db";
import { appUrl, emailDeliveryConfigured, sendTransactionalEmail } from "@/lib/email";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).optional(),
});
const deleteSchema = z.object({ password: z.string().min(1) });

export const PATCH = withApiErrorHandling(async (request: Request) => {
  const sessionUser = await requireUserOrNull();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, name: true, email: true, passwordHash: true } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const normalizedEmail = parsed.data.email?.toLowerCase().trim();
  const changingSensitiveData = Boolean(parsed.data.newPassword || (normalizedEmail && normalizedEmail !== user.email));
  if (changingSensitiveData && (!parsed.data.currentPassword || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)))) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
  }
  if (normalizedEmail && normalizedEmail !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    if (exists) return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  }

  const passwordHash = parsed.data.newPassword ? await bcrypt.hash(parsed.data.newPassword, 12) : undefined;
  const requiresVerification = Boolean(normalizedEmail && normalizedEmail !== user.email && emailDeliveryConfigured());
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name?.trim(),
      email: normalizedEmail,
      emailVerified: normalizedEmail && normalizedEmail !== user.email ? (requiresVerification ? null : new Date()) : undefined,
      passwordHash,
      passwordChangedAt: passwordHash ? new Date() : undefined,
    },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  if (requiresVerification) {
    const { token } = await issueAccountToken(user.id, "EMAIL_VERIFICATION", 24 * 60);
    const verifyUrl = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
    await sendTransactionalEmail({
      to: updated.email,
      subject: "Verify your new Memoria email",
      text: `Verify your email: ${verifyUrl}`,
      html: `<p><a href="${verifyUrl}">Verify your new Memoria email</a>. This link expires in 24 hours.</p>`,
    });
  }
  return NextResponse.json({ user: updated, requiresVerification });
});

export const DELETE = withApiErrorHandling(async (request: Request) => {
  const sessionUser = await requireUserOrNull();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your password to delete the account." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Your password is incorrect." }, { status: 400 });
  }
  await prisma.user.delete({ where: { id: sessionUser.id } });
  return NextResponse.json({ success: true });
});
