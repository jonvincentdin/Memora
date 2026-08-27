import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicCollectionBySlug } from "@/lib/share-collections-repo";
import { PublicCollectionView } from "@/components/collections/public-collection-view";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const collection = await getPublicCollectionBySlug(params.slug);
  if (!collection) return { title: "Collection not found — Memora" };
  return {
    title: `${collection.title} — Memora`,
    description: collection.description ?? `Shared by ${collection.ownerName} on Memora.`,
  };
}

// Public, unauthenticated page — no (app) layout, no session required.
// Everything rendered here comes only from items the owner explicitly
// added to this collection (see lib/share-collections-repo.ts).
export default async function PublicCollectionPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const collection = await getPublicCollectionBySlug(params.slug);
  if (!collection) notFound();

  return <PublicCollectionView collection={collection} />;
}
