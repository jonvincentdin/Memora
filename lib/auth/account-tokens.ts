import { createHash, randomBytes } from "crypto";
import type { AccountTokenType } from "@prisma/client";
import { prisma } from "@/lib/db";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAccountToken(userId: string, type: AccountTokenType, lifetimeMinutes: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + lifetimeMinutes * 60_000);
  await prisma.$transaction([
    prisma.accountToken.deleteMany({ where: { userId, type, usedAt: null } }),
    prisma.accountToken.create({ data: { userId, type, tokenHash: hashToken(token), expiresAt } }),
  ]);
  return { token, expiresAt };
}

export async function consumeAccountToken(token: string, type: AccountTokenType) {
  const record = await prisma.accountToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (!record || record.type !== type || record.usedAt || record.expiresAt <= new Date()) return null;

  const claimed = await prisma.accountToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  return claimed.count === 1 ? record.user : null;
}

export async function deleteExpiredAccountTokens() {
  return prisma.accountToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] } });
}
