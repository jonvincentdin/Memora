import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { connectionStatuses } from "@/lib/integrations/repository";
import { isProviderConfigured } from "@/lib/integrations/config";
import { withApiErrorHandling } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    connections: await connectionStatuses(user.id),
    configured: { google: isProviderConfigured("google"), notion: isProviderConfigured("notion") },
  });
});
