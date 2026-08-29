import { Prisma, type ResourceType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const schema = z.object({
  resourceType: z.enum(["NOTE", "REVIEWER", "QUIZ"]),
  resourceIds: z.array(z.string()).min(1).max(100),
  action: z.enum(["archive", "restore", "favorite", "unfavorite", "duplicate"]),
});

type Transaction = Prisma.TransactionClient;

function copyBase(title: string) {
  return title.replace(/\s+\(Copy(?:\s+\d+)?\)$/i, "").trim();
}

async function nextCopyTitle(tx: Transaction, resourceType: ResourceType, ownerId: string, sourceTitle: string) {
  const base = copyBase(sourceTitle) || sourceTitle;
  const where = { ownerId, title: { startsWith: `${base} (Copy`, mode: "insensitive" as const } };
  const matches = resourceType === "NOTE"
    ? await tx.note.findMany({ where, select: { title: true } })
    : resourceType === "REVIEWER"
      ? await tx.reviewer.findMany({ where, select: { title: true } })
      : await tx.quiz.findMany({ where, select: { title: true } });
  const used = new Set(matches.map(({ title }) => title.toLocaleLowerCase()));
  if (!used.has(`${base} (Copy)`.toLocaleLowerCase())) return `${base} (Copy)`;
  let number = 2;
  while (used.has(`${base} (Copy ${number})`.toLocaleLowerCase())) number += 1;
  return `${base} (Copy ${number})`;
}

async function copyCollectionPlacement(tx: Transaction, ownerId: string, resourceType: ResourceType, sourceId: string, copyId: string) {
  const placements = await tx.shareCollectionItem.findMany({
    where: { resourceType, resourceId: sourceId, collection: { ownerId } },
    select: { collectionId: true },
  });
  for (const placement of placements) {
    const last = await tx.shareCollectionItem.aggregate({
      where: { collectionId: placement.collectionId },
      _max: { position: true },
    });
    await tx.shareCollectionItem.create({
      data: { collectionId: placement.collectionId, resourceType, resourceId: copyId, position: (last._max.position ?? -1) + 1 },
    });
  }
}

async function duplicateResource(tx: Transaction, ownerId: string, resourceType: ResourceType, id: string) {
  if (resourceType === "NOTE") {
    const source = await tx.note.findFirst({ where: { id, ownerId }, include: { tags: { select: { tagId: true } } } });
    if (!source) throw new Error("Note not found.");
    const copy = await tx.note.create({
      data: {
        ownerId,
        title: await nextCopyTitle(tx, resourceType, ownerId, source.title),
        description: source.description,
        originalFilename: source.originalFilename,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        content: source.content,
        fileExtension: source.fileExtension,
        sourceSyncedAt: source.sourceSyncedAt,
        archivedAt: source.archivedAt,
        isFavorite: source.isFavorite,
        tags: { create: source.tags.map(({ tagId }) => ({ tagId })) },
      },
    });
    await copyCollectionPlacement(tx, ownerId, resourceType, source.id, copy.id);
    return copy.id;
  }

  if (resourceType === "REVIEWER") {
    const source = await tx.reviewer.findFirst({
      where: { id, ownerId },
      include: { noteLinks: { select: { noteId: true } }, tags: { select: { tagId: true } } },
    });
    if (!source) throw new Error("Reviewer not found.");
    const copy = await tx.reviewer.create({
      data: {
        ownerId,
        title: await nextCopyTitle(tx, resourceType, ownerId, source.title),
        description: source.description,
        style: source.style,
        content: source.content,
        archivedAt: source.archivedAt,
        isFavorite: source.isFavorite,
        noteLinks: { create: source.noteLinks.map(({ noteId }) => ({ noteId })) },
        tags: { create: source.tags.map(({ tagId }) => ({ tagId })) },
      },
    });
    await copyCollectionPlacement(tx, ownerId, resourceType, source.id, copy.id);
    return copy.id;
  }

  const source = await tx.quiz.findFirst({
    where: { id, ownerId },
    include: { reviewerLinks: { select: { reviewerId: true } }, tags: { select: { tagId: true } } },
  });
  if (!source) throw new Error("Quiz not found.");
  const copy = await tx.quiz.create({
    data: {
      ownerId,
      title: await nextCopyTitle(tx, resourceType, ownerId, source.title),
      description: source.description,
      mode: source.mode,
      configuration: source.configuration as Prisma.InputJsonValue,
      questions: source.questions as Prisma.InputJsonValue,
      archivedAt: source.archivedAt,
      isFavorite: source.isFavorite,
      reviewerLinks: { create: source.reviewerLinks.map(({ reviewerId }) => ({ reviewerId })) },
      tags: { create: source.tags.map(({ tagId }) => ({ tagId })) },
    },
  });
  await copyCollectionPlacement(tx, ownerId, resourceType, source.id, copy.id);
  return copy.id;
}

export const PATCH = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid action." }, { status: 400 });
  const { resourceType, resourceIds, action } = parsed.data;
  const ownerFilter = { id: { in: resourceIds }, ownerId: user.id };

  if (action === "archive" || action === "restore" || action === "favorite" || action === "unfavorite") {
    const data = action === "archive" ? { archivedAt: new Date() } : action === "restore" ? { archivedAt: null } : { isFavorite: action === "favorite" };
    const result = resourceType === "NOTE" ? await prisma.note.updateMany({ where: ownerFilter, data })
      : resourceType === "REVIEWER" ? await prisma.reviewer.updateMany({ where: ownerFilter, data })
      : await prisma.quiz.updateMany({ where: ownerFilter, data });
    return NextResponse.json({ updated: result.count });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const ids: string[] = [];
      for (const id of resourceIds) ids.push(await duplicateResource(tx, user.id, resourceType, id));
      return ids;
    });
    return NextResponse.json({ created: { id: created[0], ids: created } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Duplicate failed." }, { status: 404 });
  }
});
