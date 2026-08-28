import { prisma } from "@/lib/db";
import { extractFlashcardsFromMarkdown } from "@/lib/flashcards";

export async function ensureReviewerFlashcards(ownerId: string, reviewerId: string, markdown: string) {
  const existing = await prisma.flashcard.findMany({ where: { ownerId, reviewerId }, orderBy: { createdAt: "asc" } });
  if (existing.length) return existing;
  const extracted = extractFlashcardsFromMarkdown(markdown);
  if (!extracted.length) return [];
  await prisma.flashcard.createMany({ data: extracted.map((card) => ({ ownerId, reviewerId, front: card.front, back: card.back })) });
  return prisma.flashcard.findMany({ where: { ownerId, reviewerId }, orderBy: { createdAt: "asc" } });
}
