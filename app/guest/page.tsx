"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GuestReviewerFlow } from "@/components/guest/guest-reviewer-flow";
import { GuestQuizFlow } from "@/components/guest/guest-quiz-flow";

export default function GuestPage() {
  const [tab, setTab] = useState<"reviewer" | "flashcards" | "quiz" | "exam">("reviewer");

  const activities = [
    { key: "reviewer" as const, label: "Reviewer" },
    { key: "flashcards" as const, label: "Flashcards" },
    { key: "quiz" as const, label: "Quiz" },
    { key: "exam" as const, label: "Exam" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl text-ink">Quick mode</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Get a ready-made prompt in one click, paste it (and your notes) into Claude, then bring the result back
        here to preview and export. No account, no saving.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1 sm:grid-cols-4">
        {activities.map((activity) => (
          <button
            key={activity.key}
            onClick={() => setTab(activity.key)}
            className={cn("rounded-md py-2 text-sm font-medium", tab === activity.key ? "bg-ink text-white" : "text-ink-soft")}
          >
            {activity.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "reviewer" && <GuestReviewerFlow initialView="reviewer" />}
        {tab === "flashcards" && <GuestReviewerFlow initialView="flashcards" />}
        {tab === "quiz" && <GuestQuizFlow activityMode="quiz" />}
        {tab === "exam" && <GuestQuizFlow activityMode="exam" />}
      </div>
    </div>
  );
}
