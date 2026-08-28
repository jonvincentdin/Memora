import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevelForOwner } from "@/lib/permissions";
import { QuizPlayer } from "@/components/quizzes/quiz-player";
import type { QuizQuestion } from "@/lib/validation/quiz";

export default async function QuizPlayPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz) notFound();
  const access = await getAccessLevelForOwner(user.id, "QUIZ", params.id, quiz.ownerId);
  if (access === "NONE") notFound();

  const configuration = quiz.configuration as { timeLimitMinutes?: number; randomizeQuestions?: boolean };
  const testMode = searchParams.mode === "review" ? "review" : "exam";

  return (
    <QuizPlayer
      quizId={quiz.id}
      title={quiz.title}
      questions={quiz.questions as unknown as QuizQuestion[]}
      timeLimitMinutes={testMode === "exam" ? configuration.timeLimitMinutes : undefined}
      randomize={configuration.randomizeQuestions ?? false}
      testMode={testMode}
    />
  );
}
