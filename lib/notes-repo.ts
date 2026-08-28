import { prisma } from "@/lib/db";
import { compressText, decompressText } from "@/lib/compression";
import type { Note as DbNote } from "@prisma/client";

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
export type NoteSummary = Omit<DbNote, "content">;

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
export async function findNoteSummariesByOwner(ownerId: string): Promise<NoteSummary[]> {
  return prisma.note.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      ownerId: true,
      title: true,
      description: true,
      originalFilename: true,
      sourceType: true,
      sourceUrl: true,
      fileExtension: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
