import { prisma } from "@/lib/db";
import { compressText, decompressText } from "@/lib/compression";
import type { Reviewer as DbReviewer, Prisma } from "@prisma/client";

/** Same pattern as lib/notes-repo.ts — see that file's header comment. */
export type Reviewer = Omit<DbReviewer, "content"> & { content: string };

function hydrate(reviewer: DbReviewer): Reviewer {
  return { ...reviewer, content: decompressText(reviewer.content) };
}

export async function createReviewer(data: {
  ownerId: string;
  title: string;
  description?: string;
  style: DbReviewer["style"];
  content: string;
  noteIds: string[];
}): Promise<Reviewer> {
  const created = await prisma.reviewer.create({
    data: {
      ownerId: data.ownerId,
      title: data.title,
      description: data.description,
      style: data.style,
      content: compressText(data.content),
      noteLinks: { create: data.noteIds.map((noteId) => ({ noteId })) },
    },
  });
  return hydrate(created);
}

export async function updateReviewer(
  id: string,
  data: { title?: string; description?: string; content?: string }
): Promise<Reviewer> {
  const updated = await prisma.reviewer.update({
    where: { id },
    data: { ...data, content: data.content !== undefined ? compressText(data.content) : undefined },
  });
  return hydrate(updated);
}

export async function findReviewerById(
  id: string,
  include?: Prisma.ReviewerInclude
): Promise<(Reviewer & Record<string, unknown>) | null> {
  const reviewer = await prisma.reviewer.findUnique({ where: { id }, include });
  return reviewer ? (hydrate(reviewer) as Reviewer & Record<string, unknown>) : null;
}

export async function findReviewersByIds(ids: string[]): Promise<Reviewer[]> {
  if (ids.length === 0) return [];
  const reviewers = await prisma.reviewer.findMany({ where: { id: { in: ids } } });
  return reviewers.map(hydrate);
}
