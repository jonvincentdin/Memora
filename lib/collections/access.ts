import { createHmac, timingSafeEqual } from "crypto";

export function collectionAccessCookieName(slug: string) {
  return `memora_collection_${slug}`;
}

export function collectionAccessToken(slug: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET.");
  return createHmac("sha256", secret).update(`collection:${slug}`).digest("base64url");
}

export function validCollectionAccessToken(slug: string, value?: string) {
  if (!value) return false;
  const expected = collectionAccessToken(slug);
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
