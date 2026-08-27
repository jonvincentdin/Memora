import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/handler";
import { getPublicCollectionBySlug } from "@/lib/share-collections-repo";

export const GET = withApiErrorHandling(async (_request: Request, { params }: { params: { slug: string } }) => {
  const collection = await getPublicCollectionBySlug(params.slug);
  if (!collection) return NextResponse.json({ error: "This collection doesn't exist or is no longer shared." }, { status: 404 });
  return NextResponse.json({ collection });
});
