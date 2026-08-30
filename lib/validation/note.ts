import { z } from "zod";

// Notes are plain Markdown text — no separate structured JSON representation.
// GitHub-Flavored-Markdown (tables, strikethrough, task lists) is supported
// by the renderer (components/markdown/renderer.tsx via remark-gfm).

export const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  description: z.string().max(500).optional(),
  content: z.string().min(1, "Memory content cannot be empty."),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  content: z.string().min(1).optional(),
});
