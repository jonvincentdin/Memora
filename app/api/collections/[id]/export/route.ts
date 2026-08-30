import { NextResponse } from "next/server";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { getPublicCollectionBySlug } from "@/lib/share-collections-repo";
import { prisma } from "@/lib/db";
import { formatCorrectAnswer } from "@/lib/quiz-grading";
import type { QuizQuestion } from "@/lib/validation/quiz";

export const GET = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user] = await Promise.all([context.params, requireUserOrNull()]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owned = await prisma.shareCollection.findFirst({ where: { id, ownerId: user.id }, select: { slug: true, title: true } });
  if (!owned) return NextResponse.json({ error: "Collection not found." }, { status: 404 });
  const collection = await getPublicCollectionBySlug(owned.slug, true, user.id);
  if (!collection) return NextResponse.json({ error: "Collection not found." }, { status: 404 });
  const markdown = collectionMarkdown(collection);
  if (new URL(request.url).searchParams.get("format") === "json") {
    const body = JSON.stringify({ format: "memoria-collection-export", version: "1", title: collection.title, description: collection.description, notes: collection.notes, reviewers: collection.reviewers, quizzes: collection.quizzes });
    return new NextResponse(body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="memoria-collection-${safe(collection.title)}.json"` } });
  }
  return NextResponse.json({ title: collection.title, markdown });
});

function collectionMarkdown(collection: NonNullable<Awaited<ReturnType<typeof getPublicCollectionBySlug>>>) {
  const rows = [`# ${collection.title}`, collection.description ?? "", `*Shared by ${collection.ownerName} · Made with Memoria*`];
  for (const note of collection.notes) rows.push(`\n# Memory: ${note.title}\n`, note.description ?? "", note.content);
  for (const reviewer of collection.reviewers) rows.push(`\n# Reviewer: ${reviewer.title}\n`, reviewer.description ?? "", reviewer.content);
  for (const quiz of collection.quizzes) {
    const questions = quiz.questions as QuizQuestion[];
    rows.push(`\n# Quiz: ${quiz.title}\n`, quiz.description ?? "", "## Questions");
    questions.forEach((question, index) => rows.push(`${index + 1}. ${question.question}`));
    rows.push("\n## Answer key");
    questions.forEach((question, index) => rows.push(`**${index + 1}. Correct answer:** ${formatCorrectAnswer(question)}\n\n**Explanation:** ${question.explanation ?? "No explanation provided."}`));
  }
  return rows.filter(Boolean).join("\n\n");
}

function safe(value: string) { return value.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "collection"; }
