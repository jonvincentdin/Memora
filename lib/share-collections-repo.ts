import { prisma } from "@/lib/db";
import { decompressText } from "@/lib/compression";
import { randomBytes } from "crypto";
import type { ResourceType } from "@prisma/client";

function generateSlug(): string {
  return randomBytes(6).toString("base64url");
}

export async function createCollection(params: { ownerId: string; title: string; description?: string }) {
  let slug = generateSlug();
  // Extremely unlikely, but guard against a slug collision anyway.
  for (let i = 0; i < 3; i++) {
    const existing = await prisma.shareCollection.findUnique({ where: { slug } });
    if (!existing) break;
    slug = generateSlug();
  }
  return prisma.shareCollection.create({
    data: { ownerId: params.ownerId, title: params.title, description: params.description, slug },
  });
}

export async function listCollectionsForOwner(ownerId: string) {
  return prisma.shareCollection.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true, feedback: true } } },
  });
}

export async function findCollectionForOwner(ownerId: string, id: string) {
  return prisma.shareCollection.findFirst({
    where: { id, ownerId },
    include: { items: { orderBy: { position: "asc" } } },
  });
}

export async function updateCollection(
  ownerId: string,
  id: string,
  data: { title?: string; description?: string; isPublished?: boolean }
) {
  const existing = await findCollectionForOwner(ownerId, id);
  if (!existing) throw new Error("Collection not found.");
  return prisma.shareCollection.update({ where: { id }, data });
}

export async function deleteCollection(ownerId: string, id: string) {
  const existing = await findCollectionForOwner(ownerId, id);
  if (!existing) throw new Error("Collection not found.");
  await prisma.shareCollection.delete({ where: { id } });
}

export async function addCollectionItem(
  ownerId: string,
  collectionId: string,
  item: { resourceType: ResourceType; resourceId: string }
) {
  const collection = await findCollectionForOwner(ownerId, collectionId);
  if (!collection) throw new Error("Collection not found.");

  // Only the owner's own resources can be added — this is what prevents
  // someone from publishing a collection full of other people's private notes.
  const owns = await resourceBelongsTo(ownerId, item.resourceType, item.resourceId);
  if (!owns) throw new Error("You can only add your own notes, reviewers, or quizzes.");

  const position = collection.items.length;
  return prisma.shareCollectionItem.upsert({
    where: {
      collectionId_resourceType_resourceId: {
        collectionId,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
      },
    },
    update: {},
    create: { collectionId, resourceType: item.resourceType, resourceId: item.resourceId, position },
  });
}

export async function removeCollectionItem(ownerId: string, collectionId: string, itemId: string) {
  const collection = await findCollectionForOwner(ownerId, collectionId);
  if (!collection) throw new Error("Collection not found.");
  await prisma.shareCollectionItem.deleteMany({ where: { id: itemId, collectionId } });
}

async function resourceBelongsTo(ownerId: string, resourceType: ResourceType, resourceId: string): Promise<boolean> {
  if (resourceType === "NOTE") {
    return Boolean(await prisma.note.findFirst({ where: { id: resourceId, ownerId }, select: { id: true } }));
  }
  if (resourceType === "REVIEWER") {
    return Boolean(await prisma.reviewer.findFirst({ where: { id: resourceId, ownerId }, select: { id: true } }));
  }
  return Boolean(await prisma.quiz.findFirst({ where: { id: resourceId, ownerId }, select: { id: true } }));
}

export interface PublicCollectionNote {
  id: string;
  title: string;
  description: string | null;
  content: string;
}
export interface PublicCollectionReviewer {
  id: string;
  title: string;
  description: string | null;
  content: string;
}
export interface PublicCollectionQuiz {
  id: string;
  title: string;
  description: string | null;
  questions: unknown;
}
export interface PublicCollection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  ownerName: string;
  notes: PublicCollectionNote[];
  reviewers: PublicCollectionReviewer[];
  quizzes: PublicCollectionQuiz[];
  feedback: { id: string; authorName: string | null; message: string; createdAt: Date }[];
}

/**
 * Loads everything needed to render the public /c/[slug] page: only ever
 * items the owner explicitly added, hydrated read-only, and only when the
 * collection is published. Never exposes anything the owner didn't pick.
 */
export async function getPublicCollectionBySlug(slug: string): Promise<PublicCollection | null> {
  const collection = await prisma.shareCollection.findUnique({
    where: { slug },
    include: {
      owner: { select: { name: true } },
      items: { orderBy: { position: "asc" } },
      feedback: { orderBy: { createdAt: "desc" }, select: { id: true, authorName: true, message: true, createdAt: true } },
    },
  });
  if (!collection || !collection.isPublished) return null;

  const noteIds = collection.items.filter((i) => i.resourceType === "NOTE").map((i) => i.resourceId);
  const reviewerIds = collection.items.filter((i) => i.resourceType === "REVIEWER").map((i) => i.resourceId);
  const quizIds = collection.items.filter((i) => i.resourceType === "QUIZ").map((i) => i.resourceId);

  const [rawNotes, rawReviewers, rawQuizzes] = await Promise.all([
    noteIds.length
      ? prisma.note.findMany({ where: { id: { in: noteIds } }, select: { id: true, title: true, description: true, content: true } })
      : [],
    reviewerIds.length
      ? prisma.reviewer.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, title: true, description: true, content: true } })
      : [],
    quizIds.length
      ? prisma.quiz.findMany({ where: { id: { in: quizIds } }, select: { id: true, title: true, description: true, questions: true } })
      : [],
  ]);

  // Preserve the order the owner arranged items in.
  const orderIndex = new Map(collection.items.map((item, i) => [item.resourceId, i]));
  const byOrder = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));

  return {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    ownerName: collection.owner.name ?? "A Memora user",
    notes: byOrder(rawNotes.map((n) => ({ ...n, content: decompressText(n.content) }))),
    reviewers: byOrder(rawReviewers.map((r) => ({ ...r, content: decompressText(r.content) }))),
    quizzes: byOrder(rawQuizzes),
    feedback: collection.feedback,
  };
}

export async function addFeedback(params: {
  slug: string;
  authorName?: string;
  message: string;
  resourceType?: ResourceType;
  resourceId?: string;
}) {
  const collection = await prisma.shareCollection.findUnique({ where: { slug: params.slug } });
  if (!collection || !collection.isPublished) throw new Error("Collection not found.");

  return prisma.shareFeedback.create({
    data: {
      collectionId: collection.id,
      authorName: params.authorName?.trim() || null,
      message: params.message,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
    },
  });
}
