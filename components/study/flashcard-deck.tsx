"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Card {
  front: string;
  back: string;
}

export function FlashcardDeck({ title, cards, reviewerId }: { title: string; cards: Card[]; reviewerId: string }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);

  const card = cards[index];
  const done = index >= cards.length;

  function next(known: boolean) {
    if (known) setKnownCount((c) => c + 1);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/study" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to study
      </Link>
      <h1 className="mb-1 font-display text-xl text-ink">{title}</h1>

      {done ? (
        <div className="card mt-6 p-8 text-center">
          <p className="font-display text-2xl text-ink">Session complete</p>
          <p className="mt-1 text-sm text-ink-soft">
            You knew {knownCount} of {cards.length} cards.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIndex(0);
                setKnownCount(0);
                setFlipped(false);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Study again
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-ink-faint">
            Card {index + 1} of {cards.length}
          </p>
          <div
            onClick={() => setFlipped((f) => !f)}
            className={cn(
              "card flex min-h-[220px] cursor-pointer items-center justify-center p-8 text-center transition-colors",
              flipped ? "bg-accent-soft/40" : "bg-surface"
            )}
          >
            <p className="font-display text-lg text-ink">{flipped ? card.back : card.front}</p>
          </div>
          <p className="mt-2 text-center text-xs text-ink-faint">Tap the card to flip it</p>

          <div className="mt-5 flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => next(false)}>
              Still learning
            </Button>
            <Button onClick={() => next(true)}>Knew it</Button>
          </div>

          <div className="mt-4 flex justify-center gap-4 text-ink-faint">
            <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setIndex((i) => Math.min(cards.length - 1, i + 1))} disabled={index === cards.length - 1}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
