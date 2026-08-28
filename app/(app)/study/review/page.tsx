import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { FlashcardDeck } from "@/components/study/flashcard-deck";

export default async function DueReviewPage() {
  const user = await requireUser();
  const due = await prisma.flashcard.findMany({
    where: { ownerId: user.id, OR: [{ progress: { none: { userId: user.id } } }, { progress: { some: { userId: user.id, dueAt: { lte: new Date() } } } }] },
    orderBy: { updatedAt: "asc" }, take: 100, select: { id: true, front: true, back: true },
  });
  if (!due.length) return <div className="mx-auto max-w-xl text-center"><h1 className="font-display text-2xl text-ink">You&apos;re caught up</h1><p className="mt-2 text-sm text-ink-soft">No flashcards are due right now. New reviews will appear here on schedule.</p></div>;
  return <FlashcardDeck title="Due flashcards" cards={due} tracked />;
}
