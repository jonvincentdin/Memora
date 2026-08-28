import { Prisma, type ResourceType } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createResourceRevision(input: {
  ownerId: string;
  resourceType: ResourceType;
  resourceId: string;
  snapshot: Prisma.InputJsonObject;
  autosave?: boolean;
}) {
  const latest = await prisma.resourceRevision.findFirst({
    where: { ownerId: input.ownerId, resourceType: input.resourceType, resourceId: input.resourceId },
    orderBy: { createdAt: "desc" },
  });
  if (latest && JSON.stringify(latest.snapshot) === JSON.stringify(input.snapshot)) return latest;
  if (input.autosave && latest && Date.now() - latest.createdAt.getTime() < 5 * 60_000) return latest;

  const revision = await prisma.resourceRevision.create({ data: { ownerId: input.ownerId, resourceType: input.resourceType, resourceId: input.resourceId, snapshot: input.snapshot } });
  const stale = await prisma.resourceRevision.findMany({
    where: { ownerId: input.ownerId, resourceType: input.resourceType, resourceId: input.resourceId },
    orderBy: { createdAt: "desc" }, skip: 50, select: { id: true },
  });
  if (stale.length) await prisma.resourceRevision.deleteMany({ where: { id: { in: stale.map((item) => item.id) } } });
  return revision;
}
