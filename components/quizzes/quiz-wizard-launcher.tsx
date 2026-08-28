"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const QuizWizard = dynamic(
  () => import("@/components/quizzes/quiz-wizard").then((module) => module.QuizWizard),
  { loading: () => <Button loading>Loading creator</Button> }
);

export function QuizWizardLauncher({
  notes,
  reviewers,
  defaultReviewerId,
  defaults,
}: {
  notes: Array<{ id: string; title: string }>;
  reviewers: Array<{ id: string; title: string }>;
  defaultReviewerId?: string;
  defaults: { questionCount: number; difficulty: "EASY" | "NORMAL" | "HARD" | "MIXED"; mode: "QUIZ" | "PRACTICE_EXAM" | "MOCK_EXAM" | "TIMED_EXAM" | "MASTERY_TEST" };
}) {
  const [requested, setRequested] = useState(Boolean(defaultReviewerId));

  if (!requested) {
    return <Button onClick={() => setRequested(true)}><Plus className="h-4 w-4" /> Create quiz</Button>;
  }
  return <QuizWizard notes={notes} reviewers={reviewers} defaultReviewerId={defaultReviewerId} defaults={defaults} initiallyOpen />;
}
