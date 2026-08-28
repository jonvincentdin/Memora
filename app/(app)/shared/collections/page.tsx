import { CollectionsList } from "@/components/collections/collections-list";
import { requireUser } from "@/lib/auth/session";
import { listCollectionsForOwner } from "@/lib/share-collections-repo";

export default async function CollectionsPage() {
  const user = await requireUser();
  const collections = await listCollectionsForOwner(user.id);

  return <CollectionsList initialCollections={collections.map((collection) => ({ ...collection, updatedAt: collection.updatedAt.toISOString() }))} />;
}
