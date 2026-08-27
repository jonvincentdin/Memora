"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { QuestionInput } from "@/components/quizzes/question-input";
import { formatCorrectAnswer, isAnswerCorrect } from "@/lib/quiz-grading";

interface QuizPlayerProps {
  quizId: string;
  title: string;
  questions: QuizQuestion[];
  timeLimitMinutes?: number;
  randomize: boolean;
  testMode: "review" | "exam";
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function QuizPlayer({ quizId, title, questions: rawQuestions, timeLimitMinutes, randomize, testMode }: QuizPlayerProps) {
  const router = useRouter();
  const questions = useMemo(() => (randomize ? shuffle(rawQuestions) : rawQuestions), [rawQuestions, randomize]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
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
    setChecked((prev) => {
      const next = new Set(prev);
      next.delete(question.id);
      return next;
    });
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
    setSubmitError(null);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, flagged: Array.from(flagged) }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.attempt?.id) {
        router.push(`/quizzes/${quizId}/results?attempt=${data.attempt.id}`);
      } else {
        setSubmitError(data?.error ?? "Couldn't submit this attempt. Please try again.");
      }
    } catch {
      setSubmitError("We couldn't reach the server. Check your connection and try again.");
    }
    setSubmitting(false);
  }

  const answeredCount = Object.keys(answers).length;
  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ink">{title}</h1>
          <p className="text-xs text-ink-faint">
            {testMode === "review" ? "Review mode · instant feedback" : "Exam mode · feedback after submission"}
          </p>
        </div>
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

        {testMode === "review" && (
          <div className="mt-5 border-t border-line pt-4">
            {!checked.has(question.id) ? (
              <Button
                variant="outline"
                size="sm"
                disabled={answers[question.id] === undefined}
                onClick={() => setChecked((prev) => new Set(prev).add(question.id))}
              >
                Check answer
              </Button>
            ) : (
              <div
                className={cn(
                  "rounded-lg border p-4 text-sm",
                  isAnswerCorrect(question, answers[question.id])
                    ? "border-success/30 bg-success/5"
                    : "border-danger/30 bg-danger/5"
                )}
              >
                <p className={cn("font-medium", isAnswerCorrect(question, answers[question.id]) ? "text-success" : "text-danger")}>
                  {isAnswerCorrect(question, answers[question.id]) ? "Correct" : "Not quite"}
                </p>
                <p className="mt-2 text-ink"><strong>Correct answer:</strong> {formatCorrectAnswer(question)}</p>
                <p className="mt-1 text-ink-soft"><strong>Explanation:</strong> {question.explanation || "No detailed explanation was provided."}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {submitError && <p className="mt-3 text-sm text-danger">{submitError}</p>}

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
