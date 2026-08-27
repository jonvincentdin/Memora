"use client";

import { FileText } from "lucide-react";
import { exportQuizToPdf } from "@/lib/pdf-export";
import type { QuizQuestion } from "@/lib/validation/quiz";

export function ExportQuizPdfButton({
  title,
  questions,
  author,
  mode,
}: {
  title: string;
  questions: QuizQuestion[];
  author?: string | null;
  mode?: string;
}) {
  return (
    <button
      onClick={() => exportQuizToPdf(title, questions, { author, mode })}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-ink hover:bg-ink/5"
    >
      <FileText className="h-3.5 w-3.5" /> PDF
    </button>
  );
}
