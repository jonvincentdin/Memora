import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canView } from "@/lib/permissions";
import { QuizPlayer } from "@/components/quizzes/quiz-player";
import type { QuizQuestion } from "@/lib/validation/quiz";

export default async function QuizPlayPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireUser();
  const allowed = await canView(user.id, "QUIZ", params.id);
  if (!allowed) notFound();

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz) notFound();

  const configuration = quiz.configuration as { timeLimitMinutes?: number; randomizeQuestions?: boolean };

  return (
    <QuizPlayer
      quizId={quiz.id}
      title={quiz.title}
      questions={quiz.questions as unknown as QuizQuestion[]}
      timeLimitMinutes={configuration.timeLimitMinutes}
      randomize={configuration.randomizeQuestions ?? false}
    />
  );
}
