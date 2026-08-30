import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrNull } from "@/lib/auth/session";
import { getAccessToken } from "@/lib/integrations/repository";
import { syncConnectedNote } from "@/lib/notes-repo";
import { withApiErrorHandling } from "@/lib/api/handler";
import { revalidatePath } from "next/cache";

const bodySchema = z.object({ fileId: z.string().min(1).max(200) });

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a Google document first." }, { status: 400 });
  const token = await getAccessToken(user.id, "google");
  if (!token) return NextResponse.json({ error: "Connect Google in Settings first." }, { status: 409 });
  const headers = { Authorization: `Bearer ${token}` };
  const [metadataResponse, contentResponse] = await Promise.all([
    fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(parsed.data.fileId)}?fields=id,name,webViewLink`, { headers, cache: "no-store" }),
    fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(parsed.data.fileId)}/export?mimeType=text%2Fplain`, { headers, cache: "no-store" }),
  ]);
  if (!metadataResponse.ok || !contentResponse.ok) return NextResponse.json({ error: "Google could not export that document. Check its permissions or reconnect Google." }, { status: 502 });
  const metadata = await metadataResponse.json() as { name?: string; webViewLink?: string };
  const content = await contentResponse.text();
  if (!content.trim()) return NextResponse.json({ error: "That Google document has no readable text." }, { status: 422 });
  const { note, refreshed } = await syncConnectedNote({ ownerId: user.id, title: metadata.name || "Imported Google document", originalFilename: metadata.name, sourceType: "GOOGLE_DOCS", sourceExternalId: parsed.data.fileId, sourceUrl: metadata.webViewLink, content });
  revalidatePath("/notes");
  revalidatePath(`/notes/${note.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/search");
  return NextResponse.json({ note, status: refreshed ? "refreshed" : "complete" }, { status: refreshed ? 200 : 201 });
});
