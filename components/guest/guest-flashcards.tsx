"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/lib/flashcards";

export function GuestFlashcards({ cards }: { cards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [cards]);

  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-ink/[0.02] p-4 text-sm text-ink-soft">
        No term-definition pairs were detected yet. Ask the AI to include lines such as <strong>Term: definition</strong> or a two-column table.
      </div>
    );
  }

  const card = cards[Math.min(index, cards.length - 1)];

  return (
    <div>
      <p className="mb-2 text-xs text-ink-faint">Card {index + 1} of {cards.length}</p>
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className={cn(
          "card flex min-h-52 w-full items-center justify-center p-8 text-center",
          flipped ? "bg-accent-soft/40" : "bg-surface"
        )}
      >
        <span className="font-display text-lg text-ink">{flipped ? card.back : card.front}</span>
      </button>
      <p className="mt-2 text-center text-xs text-ink-faint">Tap the card to flip it</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button variant="outline" size="sm" disabled={index === 0} onClick={() => { setIndex((i) => i - 1); setFlipped(false); }}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setIndex(0); setFlipped(false); }} aria-label="Restart flashcards">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button size="sm" disabled={index === cards.length - 1} onClick={() => { setIndex((i) => i + 1); setFlipped(false); }}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
