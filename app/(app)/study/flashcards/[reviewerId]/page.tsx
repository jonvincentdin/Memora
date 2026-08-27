import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canView } from "@/lib/permissions";
import { FlashcardDeck } from "@/components/study/flashcard-deck";
import { extractFlashcardsFromMarkdown } from "@/lib/flashcards";
import { findReviewerById } from "@/lib/reviewers-repo";

export default async function FlashcardSessionPage({ params }: { params: { reviewerId: string } }) {
  const user = await requireUser();
  const allowed = await canView(user.id, "REVIEWER", params.reviewerId);
  if (!allowed) notFound();

  const reviewer = await findReviewerById(params.reviewerId);
  if (!reviewer) notFound();

  const cards = extractFlashcardsFromMarkdown(reviewer.content);

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

  return <FlashcardDeck title={reviewer.title} cards={cards} reviewerId={reviewer.id} />;
}
