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
    include: { _count: { select: { items: true, feedback: true, members: true } } },
  });
}

export async function findCollectionForOwner(ownerId: string, id: string) {
  return prisma.shareCollection.findFirst({
    where: { id, ownerId },
    include: { items: { orderBy: { position: "asc" } }, members: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } } },
  });
}

/** Loads the collection editor in one parallel database round trip. */
export async function getCollectionEditorData(ownerId: string, id: string) {
  const [collection, notes, reviewers, quizzes, feedback] = await Promise.all([
    findCollectionForOwner(ownerId, id),
    prisma.note.findMany({ where: { ownerId }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
    prisma.reviewer.findMany({ where: { ownerId }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
    prisma.quiz.findMany({ where: { ownerId }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
    prisma.shareFeedback.findMany({
      where: { collectionId: id, collection: { ownerId } },
      orderBy: { createdAt: "desc" },
      select: { id: true, authorName: true, authorUserId: true, message: true, createdAt: true, updatedAt: true, parentId: true },
    }),
  ]);

  return { collection, rows: { NOTE: notes, REVIEWER: reviewers, QUIZ: quizzes }, feedback };
}

export async function updateCollection(
  ownerId: string,
  id: string,
  data: { title?: string; description?: string; isPublished?: boolean; passwordHash?: Buffer | null; expiresAt?: Date | null }
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
  if (!owns) throw new Error("You can only add your own memories, reviewers, or quizzes.");

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

export async function reorderCollectionItems(ownerId: string, collectionId: string, itemIds: string[]) {
  const collection = await findCollectionForOwner(ownerId, collectionId);
  if (!collection || collection.items.length !== itemIds.length || collection.items.some((item) => !itemIds.includes(item.id))) throw new Error("Invalid collection order.");
  await prisma.$transaction(itemIds.map((id, position) => prisma.shareCollectionItem.update({ where: { id }, data: { position } })));
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
  feedback: { id: string; authorName: string | null; authorUserId: string | null; message: string; createdAt: Date; updatedAt: Date; parentId: string | null }[];
  viewerUserId: string | null;
  isPrivateAccess: boolean;
}

/**
 * Loads everything needed to render the public /c/[slug] page: only ever
 * items the owner explicitly added, hydrated read-only, and only when the
 * collection is published. Never exposes anything the owner didn't pick.
 */
export async function getPublicCollectionBySlug(slug: string, allowProtected = false, viewerUserId?: string): Promise<PublicCollection | null> {
  const collection = await prisma.shareCollection.findUnique({
    where: { slug },
    include: {
      owner: { select: { name: true } },
      items: { orderBy: { position: "asc" } },
      feedback: { orderBy: { createdAt: "asc" }, select: { id: true, authorName: true, authorUserId: true, message: true, createdAt: true, updatedAt: true, parentId: true } },
      members: viewerUserId ? { where: { userId: viewerUserId }, select: { id: true } } : false,
    },
  });
  if (!collection) return null;
  const isPrivateAccess = collection.ownerId === viewerUserId || ("members" in collection && Array.isArray(collection.members) && collection.members.length > 0);
  if ((!collection.isPublished && !isPrivateAccess) || (collection.expiresAt && collection.expiresAt <= new Date()) || (collection.passwordHash && !allowProtected && !isPrivateAccess)) return null;

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
    ownerName: collection.owner.name ?? "A Memoria user",
    notes: byOrder(rawNotes.map((n) => ({ ...n, content: decompressText(n.content) }))),
    reviewers: byOrder(rawReviewers.map((r) => ({ ...r, content: decompressText(r.content) }))),
    quizzes: byOrder(rawQuizzes),
    feedback: collection.feedback,
    viewerUserId: viewerUserId ?? null,
    isPrivateAccess,
  };
}

export async function addFeedback(params: {
  slug: string;
  authorName?: string;
  message: string;
  resourceType?: ResourceType;
  resourceId?: string;
  authorUserId?: string;
  parentId?: string;
}) {
  const collection = await prisma.shareCollection.findUnique({ where: { slug: params.slug } });
  const privateMember = params.authorUserId ? await prisma.shareCollectionMember.findUnique({ where: { collectionId_userId: { collectionId: collection?.id ?? "", userId: params.authorUserId } } }) : null;
  if (!collection || (!collection.isPublished && !privateMember && collection.ownerId !== params.authorUserId) || (collection.expiresAt && collection.expiresAt <= new Date())) throw new Error("Collection not found.");

  if (params.resourceType && params.resourceId) {
    const included = await prisma.shareCollectionItem.findUnique({
      where: {
        collectionId_resourceType_resourceId: {
          collectionId: collection.id,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
        },
      },
      select: { id: true },
    });
    if (!included) throw new Error("That resource is not part of this collection.");
  }

  if (params.parentId) {
    const parent = await prisma.shareFeedback.findFirst({ where: { id: params.parentId, collectionId: collection.id }, select: { id: true } });
    if (!parent) throw new Error("Feedback thread not found.");
  }

  const feedback = await prisma.shareFeedback.create({
    data: {
      collectionId: collection.id,
      authorName: params.authorName?.trim() || null,
      authorUserId: params.authorUserId,
      parentId: params.parentId,
      message: params.message,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
    },
  });
  if (collection.ownerId !== params.authorUserId) await prisma.notification.create({ data: { userId: collection.ownerId, type: "COLLECTION_FEEDBACK", title: params.parentId ? "New feedback reply" : "New collection feedback", message: params.message.slice(0, 160), href: `/shared/collections/${collection.id}?feedback=${feedback.id}` } });
  return feedback;
}
