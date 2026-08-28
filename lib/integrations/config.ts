import type { OAuthProvider } from "@/lib/integrations/oauth-state";

export function appOrigin(request: Request): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") || new URL(request.url).origin;
}

export function callbackUrl(request: Request, provider: OAuthProvider): string {
  return `${appOrigin(request)}/api/integrations/${provider}/callback`;
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  return provider === "google"
    ? Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET);
}
