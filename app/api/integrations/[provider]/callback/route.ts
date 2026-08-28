import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { callbackUrl } from "@/lib/integrations/config";
import { saveConnection } from "@/lib/integrations/repository";
import { verifyOAuthState, type OAuthProvider } from "@/lib/integrations/oauth-state";
import { withApiErrorHandling } from "@/lib/api/handler";

export const GET = withApiErrorHandling(async (request: Request, context: { params: Promise<{ provider: string }> }) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { provider: rawProvider } = await context.params;
  if (rawProvider !== "google" && rawProvider !== "notion") return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  const provider = rawProvider as OAuthProvider;
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !verifyOAuthState(state, user.id, provider)) {
    return NextResponse.redirect(new URL(`/settings?integration_error=${provider}_invalid_state`, request.url));
  }

  if (provider === "google") {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl(request, provider),
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return NextResponse.redirect(new URL("/settings?integration_error=google_exchange", request.url));
    const tokens = await tokenResponse.json() as { access_token: string; refresh_token?: string; expires_in?: number };
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
    const profile = profileResponse.ok ? await profileResponse.json() as { email?: string; name?: string } : {};
    await saveConnection({ userId: user.id, provider, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresIn: tokens.expires_in, metadata: { email: profile.email || null, name: profile.name || null } });
  } else {
    const credentials = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString("base64");
    const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json", "Notion-Version": "2026-03-11" },
      body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: callbackUrl(request, provider) }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return NextResponse.redirect(new URL("/settings?integration_error=notion_exchange", request.url));
    const tokens = await tokenResponse.json() as { access_token: string; workspace_id?: string; workspace_name?: string; workspace_icon?: string | null; bot_id?: string };
    await saveConnection({ userId: user.id, provider, accessToken: tokens.access_token, metadata: { workspaceId: tokens.workspace_id || null, workspaceName: tokens.workspace_name || null, workspaceIcon: tokens.workspace_icon || null, botId: tokens.bot_id || null } });
  }

  return NextResponse.redirect(new URL(`/settings?connected=${provider}`, request.url));
});
