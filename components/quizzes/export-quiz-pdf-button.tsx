"use client";

import { FileText } from "lucide-react";
import { exportQuizToPdf } from "@/lib/pdf-export";
import type { QuizQuestion } from "@/lib/validation/quiz";

export function ExportQuizPdfButton({ title, questions }: { title: string; questions: QuizQuestion[] }) {
  return (
    <button
      onClick={() => exportQuizToPdf(title, questions)}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-ink hover:bg-ink/5"
    >
      <FileText className="h-3.5 w-3.5" /> PDF
    </button>
  );
}
