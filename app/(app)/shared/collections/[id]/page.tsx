import { notFound } from "next/navigation";
import { CollectionEditor } from "@/components/collections/collection-editor";
import { requireUser } from "@/lib/auth/session";
import { getCollectionEditorData } from "@/lib/share-collections-repo";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const data = await getCollectionEditorData(user.id, id);
  if (!data.collection) notFound();

  return (
    <CollectionEditor
      initialCollection={data.collection}
      rows={data.rows}
      initialFeedback={data.feedback.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))}
    />
  );
}
