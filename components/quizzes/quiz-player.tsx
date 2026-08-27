"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { QuestionInput } from "@/components/quizzes/question-input";

interface QuizPlayerProps {
  quizId: string;
  title: string;
  questions: QuizQuestion[];
  timeLimitMinutes?: number;
  randomize: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function QuizPlayer({ quizId, title, questions: rawQuestions, timeLimitMinutes, randomize }: QuizPlayerProps) {
  const router = useRouter();
  const questions = useMemo(() => (randomize ? shuffle(rawQuestions) : rawQuestions), [rawQuestions, randomize]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMinutes ? timeLimitMinutes * 60 : null);

  const question = questions[index];

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function setAnswer(value: unknown) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function toggleFlag() {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(question.id)) next.delete(question.id);
      else next.add(question.id);
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    const res = await fetch(`/api/quizzes/${quizId}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, flagged: Array.from(flagged) }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      router.push(`/quizzes/${quizId}/results?attempt=${data.attempt.id}`);
    }
  }

  const answeredCount = Object.keys(answers).length;
  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-ink">{title}</h1>
        {secondsLeft !== null && (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium", secondsLeft < 60 ? "bg-danger/10 text-danger" : "bg-ink/5 text-ink-soft")}>
            <Clock className="h-3.5 w-3.5" /> {minutes}:{String(seconds).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full bg-accent transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
      </div>
      <p className="mb-4 text-xs text-ink-faint">
        Question {index + 1} of {questions.length} · {answeredCount} answered
      </p>

      <div className="card p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="font-display text-lg text-ink">{question.question}</p>
          <button onClick={toggleFlag} aria-label="Flag question">
            <Flag className={cn("h-4 w-4", flagged.has(question.id) ? "fill-accent text-accent-dark" : "text-ink-faint")} />
          </button>
        </div>

        <QuestionInput question={question} value={answers[question.id]} onChange={setAnswer} />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        {index === questions.length - 1 ? (
          <Button onClick={handleSubmit} loading={submitting}>Submit</Button>
        ) : (
          <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
