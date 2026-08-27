import { z } from "zod";

// Reviewers are Markdown text, same format as Notes. This intentionally
// replaces an earlier nested-JSON block schema: that format required an AI
// to produce exactly-shaped JSON (block types, discriminated unions, etc.),
// which frequently failed validation on real AI output. Markdown is far more
// reliable for a model to produce correctly and renders just as cleanly.

export const reviewerStyleEnum = z.enum([
  "COMPLETE",
  "QUICK",
  "EXAM",
  "CONCEPT",
  "DEFINITION",
  "COMPARISON",
  "CUSTOM",
]);

/** Strips ```markdown / ``` code fences some AI responses wrap output in, despite being asked not to. */
export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n?```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

const markdownContentSchema = z
  .string()
  .transform((val) => stripCodeFences(val))
  .refine((val) => val.length >= 20, "This looks too short to be a full reviewer — check you pasted the AI's complete response.");

export const createReviewerSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  style: reviewerStyleEnum.default("COMPLETE"),
  noteIds: z.array(z.string()).default([]),
  content: markdownContentSchema,
});

export const updateReviewerSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  content: markdownContentSchema.optional(),
});

/** Validates pasted AI markdown output before it's shown in the preview step. */
export function validateReviewerMarkdown(raw: string) {
  const result = markdownContentSchema.safeParse(raw);
  if (result.success) return { success: true as const, content: result.data };
  return { success: false as const, error: result.error.issues[0]?.message ?? "Invalid content." };
}
