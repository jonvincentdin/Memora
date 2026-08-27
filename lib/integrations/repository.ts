import { IntegrationProvider, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/integrations/crypto";
import type { OAuthProvider } from "@/lib/integrations/oauth-state";

const PROVIDERS: Record<OAuthProvider, IntegrationProvider> = {
  google: IntegrationProvider.GOOGLE,
  notion: IntegrationProvider.NOTION,
};

export async function saveConnection(input: {
  userId: string;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  metadata?: Prisma.InputJsonValue;
}) {
  const existing = await prisma.integrationConnection.findUnique({
    where: { userId_provider: { userId: input.userId, provider: PROVIDERS[input.provider] } },
  });
  return prisma.integrationConnection.upsert({
    where: { userId_provider: { userId: input.userId, provider: PROVIDERS[input.provider] } },
    create: {
      userId: input.userId,
      provider: PROVIDERS[input.provider],
      accessToken: encryptToken(input.accessToken),
      refreshToken: input.refreshToken ? encryptToken(input.refreshToken) : undefined,
      expiresAt: input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000) : undefined,
      metadata: input.metadata,
    },
    update: {
      accessToken: encryptToken(input.accessToken),
      refreshToken: input.refreshToken ? encryptToken(input.refreshToken) : existing?.refreshToken,
      expiresAt: input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000) : null,
      metadata: input.metadata,
    },
  });
}

export async function connectionStatuses(userId: string) {
  const connections = await prisma.integrationConnection.findMany({ where: { userId }, select: { provider: true, metadata: true, updatedAt: true } });
  return connections.map((connection) => ({
    provider: connection.provider.toLowerCase(),
    metadata: connection.metadata,
    updatedAt: connection.updatedAt,
  }));
}

export async function disconnectProvider(userId: string, provider: OAuthProvider) {
  await prisma.integrationConnection.deleteMany({ where: { userId, provider: PROVIDERS[provider] } });
}

export async function getAccessToken(userId: string, provider: OAuthProvider): Promise<string | null> {
  const connection = await prisma.integrationConnection.findUnique({ where: { userId_provider: { userId, provider: PROVIDERS[provider] } } });
  if (!connection) return null;
  if (provider === "google" && connection.expiresAt && connection.expiresAt.getTime() < Date.now() + 60_000 && connection.refreshToken) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        refresh_token: decryptToken(connection.refreshToken),
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Google connection expired. Reconnect it in Settings.");
    const tokens = await response.json() as { access_token: string; expires_in?: number };
    await saveConnection({ userId, provider, accessToken: tokens.access_token, expiresIn: tokens.expires_in });
    return tokens.access_token;
  }
  return decryptToken(connection.accessToken);
}
