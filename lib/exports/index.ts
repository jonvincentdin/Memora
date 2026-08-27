import type { Quiz } from "@prisma/client";
import type { Note } from "@/lib/notes-repo";
import type { Reviewer } from "@/lib/reviewers-repo";

/** Versioned JSON export of a note, re-importable into Memora. Takes the already-decompressed Note shape from lib/notes-repo. */
export function exportNoteAsJson(note: Pick<Note, "title" | "description" | "content">) {
  return {
    format: "memora-note-export",
    version: "1",
    title: note.title,
    description: note.description ?? undefined,
    content: note.content,
  };
}

/** Versioned JSON export of a reviewer, re-importable into Memora. Takes the already-decompressed Reviewer shape from lib/reviewers-repo. */
export function exportReviewerAsJson(reviewer: Pick<Reviewer, "title" | "description" | "content" | "style">) {
  return {
    format: "memora-reviewer-export",
    version: "1",
    title: reviewer.title,
    description: reviewer.description ?? undefined,
    style: reviewer.style,
    content: reviewer.content,
  };
}

export function exportQuizAsJson(quiz: Pick<Quiz, "title" | "configuration" | "questions">) {
  return {
    format: "memora-quiz-v1",
    version: "1",
    title: quiz.title,
    settings: quiz.configuration,
    questions: quiz.questions,
  };
}

export function exportQuizAsTxt(quiz: Pick<Quiz, "title" | "questions">): string {
  const questions = quiz.questions as { question: string; explanation?: string }[];
  const body = questions
    .map((q, i) => `${i + 1}. ${q.question}${q.explanation ? `\n   Explanation: ${q.explanation}` : ""}`)
    .join("\n\n");
  return `${quiz.title}\n${"=".repeat(40)}\n\n${body}\n`;
}
