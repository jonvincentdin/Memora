"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GuestReviewerFlow } from "@/components/guest/guest-reviewer-flow";
import { GuestQuizFlow } from "@/components/guest/guest-quiz-flow";

export default function GuestPage() {
  const [tab, setTab] = useState<"reviewer" | "quiz">("reviewer");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl text-ink">Quick mode</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Get a ready-made prompt in one click, paste it (and your notes) into Claude, then bring the result back
        here to preview and export. No account, no saving.
      </p>

      <div className="mt-6 flex gap-1 rounded-lg border border-line bg-surface p-1">
        <button
          onClick={() => setTab("reviewer")}
          className={cn("flex-1 rounded-md py-2 text-sm font-medium", tab === "reviewer" ? "bg-ink text-white" : "text-ink-soft")}
        >
          Reviewer
        </button>
        <button
          onClick={() => setTab("quiz")}
          className={cn("flex-1 rounded-md py-2 text-sm font-medium", tab === "quiz" ? "bg-ink text-white" : "text-ink-soft")}
        >
          Quiz
        </button>
      </div>

      <div className="mt-4">{tab === "reviewer" ? <GuestReviewerFlow /> : <GuestQuizFlow />}</div>
    </div>
  );
}
