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
  const [quiz, settings] = await Promise.all([
    prisma.quiz.findUnique({ where: { id: params.id } }),
    prisma.userSettings.findUnique({ where: { userId: user.id }, select: { showExplanations: true } }),
  ]);
  if (!quiz) notFound();
  const access = await getAccessLevelForOwner(user.id, "QUIZ", params.id, quiz.ownerId);
  if (access === "NONE") notFound();

  const testMode = searchParams.mode === "review" ? "review" : "exam";

  return (
    <QuizPlayer
      quizId={quiz.id}
      title={quiz.title}
      questions={quiz.questions as unknown as QuizQuestion[]}
      testMode={testMode}
      showExplanations={settings?.showExplanations ?? true}
    />
  );
}
