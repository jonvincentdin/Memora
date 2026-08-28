import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWithProvider } from "@/lib/ai/providers";

afterEach(() => vi.unstubAllGlobals());

describe("AI provider adapters", () => {
  it("uses the non-storing Responses API for OpenAI", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: "quiz json" }] }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateWithProvider({ provider: "OPENAI", apiKey: "secret", model: "gpt-test", prompt: "Generate a sufficiently long quiz prompt." })).resolves.toBe("quiz json");
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ store: false, model: "gpt-test" });
    expect(init.headers.Authorization).toBe("Bearer secret");
  });

  it("parses Anthropic text blocks", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "text", text: "reviewer" }] }), { status: 200 })));
    await expect(generateWithProvider({ provider: "ANTHROPIC", apiKey: "secret", prompt: "Generate a sufficiently long reviewer prompt." })).resolves.toBe("reviewer");
  });

  it("parses Gemini candidate parts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "cards" }] } }] }), { status: 200 })));
    await expect(generateWithProvider({ provider: "GEMINI", apiKey: "secret", prompt: "Generate sufficiently detailed flashcards." })).resolves.toBe("cards");
  });

  it("does not leak provider error response bodies beyond their message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 })));
    await expect(generateWithProvider({ provider: "OPENAI", apiKey: "secret", prompt: "Generate a sufficiently long quiz prompt." })).rejects.toThrow("Invalid API key");
  });
});
