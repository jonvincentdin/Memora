import { prisma } from "@/lib/db";
import { compressText, decompressText } from "@/lib/compression";
import type { Note as DbNote } from "@prisma/client";
import { createResourceRevision } from "@/lib/revisions";

/**
 * The Note shape the rest of the app works with — identical to Prisma's
 * generated `Note` type except `content` is the decompressed string, not
 * raw gzip bytes.
 *
 * Nothing outside this file (and lib/reviewers-repo.ts for its Reviewer
 * equivalent) should call `prisma.note` directly when `content` is
 * involved — every other call site should go through the functions below,
 * so there is exactly one place that knows the column is compressed.
 */
export type Note = Omit<DbNote, "content"> & { content: string };
export type NoteSummary = Omit<DbNote, "content"> & {
  tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
};

function hydrate(note: DbNote): Note {
  return { ...note, content: decompressText(note.content) };
}

export async function createNote(data: {
  ownerId: string;
  title: string;
  description?: string;
  content: string;
  sourceType: DbNote["sourceType"];
  originalFilename?: string;
  fileExtension?: string;
  sourceUrl?: string;
}): Promise<Note> {
  const created = await prisma.note.create({
    data: { ...data, content: compressText(data.content) },
  });
  return hydrate(created);
}

export async function syncConnectedNote(data: {
  ownerId: string;
  title: string;
  content: string;
  sourceType: "GOOGLE_DOCS" | "NOTION";
  sourceExternalId: string;
  sourceUrl?: string;
  originalFilename?: string;
}): Promise<{ note: Note; refreshed: boolean }> {
  const existing = await prisma.note.findUnique({
    where: { ownerId_sourceType_sourceExternalId: { ownerId: data.ownerId, sourceType: data.sourceType, sourceExternalId: data.sourceExternalId } },
  });
  if (existing) {
    const current = hydrate(existing);
    await createResourceRevision({ ownerId: data.ownerId, resourceType: "NOTE", resourceId: current.id, snapshot: { title: current.title, description: current.description ?? null, content: current.content } });
  }
  const syncedAt = new Date();
  const note = await prisma.note.upsert({
    where: { ownerId_sourceType_sourceExternalId: { ownerId: data.ownerId, sourceType: data.sourceType, sourceExternalId: data.sourceExternalId } },
    create: { ...data, content: compressText(data.content), sourceSyncedAt: syncedAt },
    update: { title: data.title, content: compressText(data.content), sourceUrl: data.sourceUrl, originalFilename: data.originalFilename, sourceSyncedAt: syncedAt, archivedAt: null },
  });
  return { note: hydrate(note), refreshed: Boolean(existing) };
}

export async function updateNote(
  id: string,
  data: { title?: string; description?: string; content?: string }
): Promise<Note> {
  const updated = await prisma.note.update({
    where: { id },
    data: { ...data, content: data.content !== undefined ? compressText(data.content) : undefined },
  });
  return hydrate(updated);
}

export async function findNoteById(id: string): Promise<Note | null> {
  const note = await prisma.note.findUnique({ where: { id } });
  return note ? hydrate(note) : null;
}

export async function findNotesByIds(ids: string[]): Promise<Note[]> {
  if (ids.length === 0) return [];
  const notes = await prisma.note.findMany({ where: { id: { in: ids } } });
  return notes.map(hydrate);
}

/** Full notes (decompressed) for a given owner, newest first — used where a content preview is shown. */
export async function findNotesByOwner(ownerId: string): Promise<Note[]> {
  const notes = await prisma.note.findMany({ where: { ownerId }, orderBy: { updatedAt: "desc" } });
  return notes.map(hydrate);
}

/** Metadata-only list for the notes library. Avoids transferring and
 * decompressing every full lesson merely to render navigation cards. */
export async function findNoteSummariesByOwner(ownerId: string, options: { archived?: boolean; page?: number; pageSize?: number } = {}): Promise<NoteSummary[]> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 24));
  return prisma.note.findMany({
    where: { ownerId, archivedAt: options.archived ? { not: null } : null },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      ownerId: true,
      title: true,
      description: true,
      originalFilename: true,
      sourceType: true,
      sourceUrl: true,
      fileExtension: true,
      sourceExternalId: true,
      sourceSyncedAt: true,
      archivedAt: true,
      isFavorite: true,
      createdAt: true,
      updatedAt: true,
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
  });
}
