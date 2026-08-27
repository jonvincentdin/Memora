import { gzipSync, gunzipSync } from "node:zlib";

/**
 * Note and Reviewer content is free-form Markdown that can run from a few
 * hundred bytes to tens of thousands — across many users this adds up fast.
 * Gzip on plain-language text routinely shrinks it 60-80%, so it's stored
 * compressed (as Postgres `bytea`) and decompressed only where it's actually
 * read, rather than kept as a large `text` column that Postgres has to store
 * and index in full.
 *
 * This lives behind lib/notes-repo.ts and lib/reviewers-repo.ts — nothing
 * else in the app should call these directly or read/write
 * Note.content / Reviewer.content via `prisma.note` / `prisma.reviewer`
 * directly, since that would return raw compressed bytes instead of text.
 */
export function compressText(text: string): Buffer {
  return gzipSync(Buffer.from(text, "utf-8"));
}

export function decompressText(data: Buffer): string {
  return gunzipSync(data).toString("utf-8");
}
