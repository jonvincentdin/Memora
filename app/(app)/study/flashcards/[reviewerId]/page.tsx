import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevelForOwner } from "@/lib/permissions";
import { FlashcardDeck } from "@/components/study/flashcard-deck";
import { extractFlashcardsFromMarkdown } from "@/lib/flashcards";
import { findReviewerById } from "@/lib/reviewers-repo";
import { ensureReviewerFlashcards } from "@/lib/flashcards-repo";
import { prisma } from "@/lib/db";

export default async function FlashcardSessionPage(props: { params: Promise<{ reviewerId: string }> }) {
  const params = await props.params;
  const user = await requireUser();
  const reviewer = await findReviewerById(params.reviewerId);
  if (!reviewer) notFound();
  const access = await getAccessLevelForOwner(user.id, "REVIEWER", params.reviewerId, reviewer.ownerId);
  if (access === "NONE") notFound();

  const cards = access === "OWNER"
    ? await ensureReviewerFlashcards(user.id, reviewer.id, reviewer.content)
    : extractFlashcardsFromMarkdown(reviewer.content).map((card, index) => ({ id: `shared-${index}`, ...card }));
  const progress = access === "OWNER" && cards.length
    ? await prisma.flashcardProgress.findMany({ where: { userId: user.id, flashcardId: { in: cards.map((card) => card.id) } } })
    : [];
  const progressByCard = new Map(progress.map((item) => [item.flashcardId, item]));
  const orderedCards = [...cards].sort((left, right) => (progressByCard.get(left.id)?.dueAt.getTime() ?? 0) - (progressByCard.get(right.id)?.dueAt.getTime() ?? 0));

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <p className="font-display text-lg text-ink">No flashcard-ready content found</p>
        <p className="mt-2 text-sm text-ink-soft">
          Flashcards are pulled from <strong>Term: Definition</strong> style bullets, two-column tables, and
          blockquote callouts in this reviewer. Add some, or study it directly on its page instead.
        </p>
      </div>
    );
  }

  return <FlashcardDeck title={reviewer.title} cards={orderedCards} tracked={access === "OWNER"} />;
}
