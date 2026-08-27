import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { disconnectProvider } from "@/lib/integrations/repository";
import type { OAuthProvider } from "@/lib/integrations/oauth-state";
import { withApiErrorHandling } from "@/lib/api/handler";

export const DELETE = withApiErrorHandling(async (_request: Request, context: { params: Promise<{ provider: string }> }) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { provider } = await context.params;
  if (provider !== "google" && provider !== "notion") return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  await disconnectProvider(user.id, provider as OAuthProvider);
  return NextResponse.json({ ok: true });
});
