import type { AiProvider } from "@prisma/client";

const REQUEST_TIMEOUT_MS = 90_000;

export const DEFAULT_AI_MODELS: Record<AiProvider, string> = {
  OPENAI: "gpt-5-mini",
  ANTHROPIC: "claude-haiku-4-5",
  GEMINI: "gemini-3.7-flash",
};

async function requestJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as { error?: { message?: string }; message?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || `The AI provider returned ${response.status}.`);
  }
  return payload;
}

function openAiText(payload: unknown): string {
  const data = payload as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (data.output_text) return data.output_text;
  return data.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("") ?? "";
}

export async function generateWithProvider(input: {
  provider: AiProvider;
  apiKey: string;
  model?: string | null;
  prompt: string;
}): Promise<string> {
  const model = input.model?.trim() || DEFAULT_AI_MODELS[input.provider];
  let payload: unknown;

  if (input.provider === "OPENAI") {
    payload = await requestJson("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: input.prompt, store: false }),
    });
    const text = openAiText(payload);
    if (text) return text;
  }

  if (input.provider === "ANTHROPIC") {
    payload = await requestJson("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": input.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 8192, messages: [{ role: "user", content: input.prompt }] }),
    });
    const text = (payload as { content?: Array<{ type?: string; text?: string }> }).content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("") ?? "";
    if (text) return text;
  }

  if (input.provider === "GEMINI") {
    payload = await requestJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": input.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: input.prompt }] }] }),
    });
    const text = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.flatMap((candidate) => candidate.content?.parts ?? []).map((part) => part.text ?? "").join("") ?? "";
    if (text) return text;
  }

  throw new Error("The provider returned an empty response.");
}
