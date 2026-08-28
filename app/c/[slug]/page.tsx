import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicCollectionBySlug } from "@/lib/share-collections-repo";
import { PublicCollectionView } from "@/components/collections/public-collection-view";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { collectionAccessCookieName, validCollectionAccessToken } from "@/lib/collections/access";
import { CollectionPasswordGate } from "@/components/collections/collection-password-gate";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const collection = await prisma.shareCollection.findUnique({ where: { slug: params.slug }, select: { title: true, description: true, isPublished: true } });
  if (!collection?.isPublished) return { title: "Collection not found — Memora" };
  return {
    title: `${collection.title} — Memora`,
    description: collection.description ?? "A study collection shared on Memora.",
  };
}

// Public, unauthenticated page — no (app) layout, no session required.
// Everything rendered here comes only from items the owner explicitly
// added to this collection (see lib/share-collections-repo.ts).
export default async function PublicCollectionPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const gate = await prisma.shareCollection.findUnique({ where: { slug: params.slug }, select: { title: true, passwordHash: true, isPublished: true, expiresAt: true } });
  if (!gate?.isPublished || (gate.expiresAt && gate.expiresAt <= new Date())) notFound();
  const cookieStore = await cookies();
  const access = !gate.passwordHash || validCollectionAccessToken(params.slug, cookieStore.get(collectionAccessCookieName(params.slug))?.value);
  if (!access) return <CollectionPasswordGate slug={params.slug} title={gate.title} />;
  const collection = await getPublicCollectionBySlug(params.slug, true);
  if (!collection) notFound();

  return <PublicCollectionView collection={collection} />;
}
