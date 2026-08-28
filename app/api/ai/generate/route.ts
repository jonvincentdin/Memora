import { AiProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithProvider } from "@/lib/ai/providers";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/integrations/crypto";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({ provider: z.nativeEnum(AiProvider).optional(), prompt: z.string().min(20).max(250_000) });

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  if (await isRateLimited(`ai:${user.id}`, 12, 60_000)) return NextResponse.json({ error: "Too many AI requests. Try again in a minute." }, { status: 429 });

  const connection = await prisma.aiConnection.findFirst({
    where: { userId: user.id, ...(parsed.data.provider ? { provider: parsed.data.provider } : {}) },
    orderBy: { updatedAt: "desc" },
  });
  if (!connection) return NextResponse.json({ error: "Connect an AI provider in Settings first.", code: "NO_AI_CONNECTION" }, { status: 409 });

  const apiKey = decryptToken(connection.apiKey);
  try {
    const text = await generateWithProvider({ provider: connection.provider, apiKey, model: connection.model, prompt: parsed.data.prompt });
    return NextResponse.json({ text, provider: connection.provider, model: connection.model });
  } catch (error) {
    const message = (error instanceof Error ? error.message : "AI generation failed.").replaceAll(apiKey, "[redacted]").slice(0, 500);
    return NextResponse.json({ error: message }, { status: 502 });
  }
});
