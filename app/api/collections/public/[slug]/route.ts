import { NextResponse } from "next/server";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { getPublicCollectionBySlug } from "@/lib/share-collections-repo";

export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ slug: string }>) => {
  const params = await context.params;
  const collection = await getPublicCollectionBySlug(params.slug);
  if (!collection) return NextResponse.json({ error: "This collection doesn't exist or is no longer shared." }, { status: 404 });
  return NextResponse.json({ collection });
});
