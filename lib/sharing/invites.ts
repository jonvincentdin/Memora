import { prisma } from "@/lib/db";

export async function acceptPendingInvites(userId: string, email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const invites = await prisma.resourceInvite.findMany({ where: { email: normalizedEmail, expiresAt: { gt: new Date() } } });
  if (!invites.length) return 0;
  await prisma.$transaction([
    ...invites.map((invite) => prisma.resourceShare.upsert({
      where: { resourceId_resourceType_userId: { resourceId: invite.resourceId, resourceType: invite.resourceType, userId } },
      create: { resourceId: invite.resourceId, resourceType: invite.resourceType, ownerId: invite.ownerId, userId, permission: invite.permission },
      update: { permission: invite.permission },
    })),
    prisma.resourceInvite.deleteMany({ where: { id: { in: invites.map((invite) => invite.id) } } }),
  ]);
  return invites.length;
}
