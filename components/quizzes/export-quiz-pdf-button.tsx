"use client";

import { FileText } from "lucide-react";
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
  async function handleExport() {
    const { exportQuizToPdf } = await import("@/lib/pdf-export");
    exportQuizToPdf(title, questions, { author, mode });
  }

  return (
    <button
      onClick={() => void handleExport()}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-ink hover:bg-ink/5"
    >
      <FileText className="h-3.5 w-3.5" /> PDF
    </button>
  );
}
