import { AiProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/integrations/crypto";
import { DEFAULT_AI_MODELS } from "@/lib/ai/providers";

const schema = z.object({
  provider: z.nativeEnum(AiProvider),
  apiKey: z.string().trim().min(8).max(1000),
  model: z.string().trim().min(1).max(100).optional(),
});

export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const connections = await prisma.aiConnection.findMany({
    where: { userId: user.id },
    select: { provider: true, model: true, updatedAt: true },
    orderBy: { provider: "asc" },
  });
  return NextResponse.json({ connections, defaults: DEFAULT_AI_MODELS });
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const connection = await prisma.aiConnection.upsert({
    where: { userId_provider: { userId: user.id, provider: parsed.data.provider } },
    create: { userId: user.id, provider: parsed.data.provider, apiKey: encryptToken(parsed.data.apiKey), model: parsed.data.model || DEFAULT_AI_MODELS[parsed.data.provider] },
    update: { apiKey: encryptToken(parsed.data.apiKey), model: parsed.data.model || DEFAULT_AI_MODELS[parsed.data.provider] },
    select: { provider: true, model: true, updatedAt: true },
  });
  return NextResponse.json({ connection });
});

export const DELETE = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const provider = new URL(request.url).searchParams.get("provider");
  if (!provider || !Object.values(AiProvider).includes(provider as AiProvider)) return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  await prisma.aiConnection.deleteMany({ where: { userId: user.id, provider: provider as AiProvider } });
  return NextResponse.json({ success: true });
});
