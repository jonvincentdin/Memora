"use client";

import { useMemo, useState } from "react";
import { BookMarked, FileText, ScrollText, HelpCircle, Layers, MessageSquare, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { QuestionInput } from "@/components/quizzes/question-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea, Input, Label } from "@/components/ui/input";
import { gradeQuiz } from "@/lib/quiz-grading";
import { extractFlashcardsFromMarkdown } from "@/lib/flashcards";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/validation/quiz";
import type { PublicCollection } from "@/lib/share-collections-repo";

type SectionKey = "notes" | "reviewers" | "quizzes" | "flashcards";

export function PublicCollectionView({ collection }: { collection: PublicCollection }) {
  const flashcardsByReviewer = useMemo(
    () => collection.reviewers.map((r) => ({ reviewer: r, cards: extractFlashcardsFromMarkdown(r.content) })).filter((r) => r.cards.length > 0),
    [collection.reviewers]
  );

  const sections: { key: SectionKey; label: string; icon: typeof FileText; count: number }[] = [
    { key: "notes", label: "Notes", icon: FileText, count: collection.notes.length },
    { key: "reviewers", label: "Reviewers", icon: ScrollText, count: collection.reviewers.length },
    { key: "quizzes", label: "Quizzes", icon: HelpCircle, count: collection.quizzes.length },
    { key: "flashcards", label: "Flashcards", icon: Layers, count: flashcardsByReviewer.length },
  ].filter((s) => s.count > 0);

  const [active, setActive] = useState<SectionKey>(sections[0]?.key ?? "notes");
  const [feedback, setFeedback] = useState(collection.feedback);

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-ink-faint">
            <BookMarked className="h-4 w-4 text-accent-dark" /> Memora collection
          </div>
          <h1 className="mt-1 font-display text-2xl text-ink">{collection.title}</h1>
          {collection.description && <p className="mt-1 text-sm text-ink-soft">{collection.description}</p>}
          <p className="mt-2 text-xs text-ink-faint">
            Shared by {collection.ownerName} · view-only — you can look around and leave feedback, but nothing here can be edited.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {sections.length === 0 ? (
          <p className="text-sm text-ink-faint">This collection doesn&apos;t have anything in it yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1 w-fit">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium",
                    active === s.key ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5"
                  )}
                >
                  <s.icon className="h-3.5 w-3.5" /> {s.label} ({s.count})
                </button>
              ))}
            </div>

            <div className="mt-6">
              {active === "notes" && (
                <div className="space-y-6">
                  {collection.notes.map((note) => (
                    <div key={note.id} className="card p-6">
                      <h2 className="font-display text-lg text-ink">{note.title}</h2>
                      {note.description && <p className="mt-1 text-sm text-ink-soft">{note.description}</p>}
                      <div className="mt-4">
                        <MarkdownRenderer content={note.content} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {active === "reviewers" && (
                <div className="space-y-6">
                  {collection.reviewers.map((reviewer) => (
                    <div key={reviewer.id} className="card p-6">
                      <h2 className="font-display text-lg text-ink">{reviewer.title}</h2>
                      {reviewer.description && <p className="mt-1 text-sm text-ink-soft">{reviewer.description}</p>}
                      <div className="mt-4">
                        <MarkdownRenderer content={reviewer.content} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {active === "quizzes" && (
                <div className="space-y-6">
                  {collection.quizzes.map((quiz) => (
                    <PublicQuiz key={quiz.id} title={quiz.title} description={quiz.description} questions={quiz.questions as QuizQuestion[]} />
                  ))}
                </div>
              )}

              {active === "flashcards" && (
                <div className="space-y-8">
                  {flashcardsByReviewer.map(({ reviewer, cards }) => (
                    <div key={reviewer.id}>
                      <h2 className="mb-3 font-display text-lg text-ink">{reviewer.title}</h2>
                      <PublicFlashcardDeck cards={cards} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <FeedbackSection slug={collection.slug} feedback={feedback} onSubmitted={(f) => setFeedback((prev) => [f, ...prev])} />
      </div>
    </div>
  );
}

function PublicQuiz({ title, description, questions }: { title: string; description: string | null; questions: QuizQuestion[] }) {
  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
          <p className="mt-1 text-xs text-ink-faint">{questions.length} questions · answers aren&apos;t saved anywhere</p>
        </div>
        {!taking && (
          <Button
            onClick={() => {
              setTaking(true);
              setResult(null);
              setAnswers({});
            }}
          >
            Try it
          </Button>
        )}
      </div>

      {taking && !result && (
        <div className="mt-5 space-y-6">
          {questions.map((q, i) => (
            <div key={q.id}>
              <p className="mb-2 text-sm font-medium text-ink">
                {i + 1}. {q.prompt}
              </p>
              <QuestionInput question={q} value={answers[q.id]} onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))} />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTaking(false)}>
              Cancel
            </Button>
            <Button onClick={() => setResult({ score: gradeQuiz(questions, answers).score, total: questions.length })}>
              Submit
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-5 rounded-lg border border-line bg-ink/[0.02] p-5 text-center">
          <p className="font-display text-2xl text-ink">
            {result.score} / {result.total}
          </p>
          <p className="mt-1 text-sm text-ink-soft">Nice work — this attempt isn&apos;t saved anywhere.</p>
          <Button variant="outline" className="mt-3" onClick={() => setTaking(false)}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}

function PublicFlashcardDeck({ cards }: { cards: { front: string; back: string }[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];

  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-3 text-xs text-ink-faint">
        Card {index + 1} of {cards.length}
      </p>
      <div
        onClick={() => setFlipped((f) => !f)}
        className={cn(
          "card flex min-h-[180px] cursor-pointer items-center justify-center p-8 text-center transition-colors",
          flipped ? "bg-accent-soft/40" : "bg-surface"
        )}
      >
        <p className="font-display text-lg text-ink">{flipped ? card.back : card.front}</p>
      </div>
      <p className="mt-2 text-center text-xs text-ink-faint">Tap the card to flip it</p>
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={() => {
            setFlipped(false);
            setIndex((i) => Math.max(0, i - 1));
          }}
          disabled={index === 0}
          className="text-ink-faint disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            setFlipped(false);
            setIndex(0);
          }}
          className="text-ink-faint"
          title="Restart"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setFlipped(false);
            setIndex((i) => Math.min(cards.length - 1, i + 1));
          }}
          disabled={index === cards.length - 1}
          className="text-ink-faint disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function FeedbackSection({
  slug,
  feedback,
  onSubmitted,
}: {
  slug: string;
  feedback: PublicCollection["feedback"];
  onSubmitted: (f: PublicCollection["feedback"][number]) => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/collections/public/${slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name.trim() || undefined, message: message.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!data) {
        setError("The server sent back something unexpected. Please try again.");
      } else if (!res.ok) {
        setError(data.error ?? "Couldn't send feedback.");
      } else {
        onSubmitted({ id: data.feedback.id, authorName: name.trim() || null, message: message.trim(), createdAt: new Date().toISOString() });
        setMessage("");
        setSent(true);
        setTimeout(() => setSent(false), 2000);
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setSending(false);
  }

  return (
    <div className="mt-12 border-t border-line pt-8">
      <h2 className="flex items-center gap-1.5 font-display text-lg text-ink">
        <MessageSquare className="h-4 w-4" /> Feedback
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Leave a note for whoever shared this — they&apos;ll see it, but you can&apos;t edit anything here.</p>

      <div className="card mt-4 p-5">
        <Label htmlFor="feedback-name">Name (optional)</Label>
        <Input id="feedback-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anonymous" className="mt-1.5" />
        <div className="mt-3">
          <Label htmlFor="feedback-message">Your feedback</Label>
          <Textarea id="feedback-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Thoughts, corrections, questions…" className="mt-1.5" />
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-3 flex items-center justify-end gap-2">
          {sent && <span className="text-sm text-success">Sent, thank you!</span>}
          <Button onClick={submit} loading={sending} disabled={!message.trim()}>
            Send feedback
          </Button>
        </div>
      </div>

      {feedback.length > 0 && (
        <div className="mt-5 space-y-2">
          {feedback.map((f) => (
            <div key={f.id} className="rounded-lg border border-line bg-surface p-3.5">
              <p className="text-sm text-ink">{f.message}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {f.authorName || "Anonymous"} · {formatRelativeTime(f.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-ink-faint">
        Made with <Badge tone="accent">Memora</Badge>
      </p>
    </div>
  );
}
