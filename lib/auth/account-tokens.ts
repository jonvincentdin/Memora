import { createHash, randomBytes, randomInt } from "crypto";
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

export async function issueAccountCode(userId: string, type: AccountTokenType, lifetimeMinutes: number) {
  const code = randomInt(100_000, 1_000_000).toString();
  const expiresAt = new Date(Date.now() + lifetimeMinutes * 60_000);
  await prisma.$transaction([
    // Only the newest verification code should ever work. Removing older
    // records also prevents a rare unique-hash collision if a code repeats.
    prisma.accountToken.deleteMany({ where: { userId, type } }),
    prisma.accountToken.create({ data: { userId, type, tokenHash: hashToken(`${userId}:${code}`), expiresAt } }),
  ]);
  return { code, expiresAt };
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

export async function consumeAccountCode(email: string, code: string, type: AccountTokenType) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true, name: true },
  });
  if (!user) return null;

  const record = await prisma.accountToken.findUnique({
    where: { tokenHash: hashToken(`${user.id}:${code}`) },
  });
  if (!record || record.userId !== user.id || record.type !== type || record.usedAt || record.expiresAt <= new Date()) return null;

  const claimed = await prisma.accountToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  return claimed.count === 1 ? user : null;
}

export async function deleteExpiredAccountTokens() {
  return prisma.accountToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] } });
}
