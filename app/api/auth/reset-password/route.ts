import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { consumeAccountToken } from "@/lib/auth/account-tokens";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { withApiErrorHandling } from "@/lib/api/handler";

export const POST = withApiErrorHandling(async (request: Request) => {
  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const user = await consumeAccountToken(parsed.data.token, "PASSWORD_RESET");
  if (!user) return NextResponse.json({ error: "That reset link is invalid or has expired." }, { status: 400 });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date() } });
  return NextResponse.json({ success: true });
});
