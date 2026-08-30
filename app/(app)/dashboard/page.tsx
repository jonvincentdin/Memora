import Link from "next/link";
import { FileInput, Layers, ListChecks, PlayCircle, FileText, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";

const quickActions = [
  { href: "/notes/import", label: "Import Note", icon: FileInput },
  { href: "/reviewers", label: "Create Reviewer", icon: Layers },
  { href: "/quizzes", label: "Create Quiz", icon: ListChecks },
  { href: "/study", label: "Start Study Session", icon: PlayCircle },
];

export default async function DashboardPage() {
  const user = await requireUser();

  const [recentNotes, recentReviewers, recentQuizzes, recentAttempts, noteCount, reviewerCount, quizCount, quizAttemptCount] = await Promise.all([
    prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, updatedAt: true } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, updatedAt: true } }),
    prisma.quiz.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, updatedAt: true } }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 4,
      select: { score: true, totalQuestions: true },
    }),
    prisma.note.count({ where: { ownerId: user.id, archivedAt: null } }),
    prisma.reviewer.count({ where: { ownerId: user.id, archivedAt: null } }),
    prisma.quiz.count({ where: { ownerId: user.id, archivedAt: null } }),
    prisma.quizAttempt.count({ where: { userId: user.id, completedAt: { not: null } } }),
  ]);

  const memories = [
    ...recentNotes.map((item) => ({ ...item, type: "Note", href: `/notes/${item.id}`, icon: FileText })),
    ...recentReviewers.map((item) => ({ ...item, type: "Reviewer", href: `/reviewers/${item.id}`, icon: Layers })),
    ...recentQuizzes.map((item) => ({ ...item, type: "Quiz", href: `/quizzes/${item.id}`, icon: ListChecks })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 8);
  const memoryCount = noteCount + reviewerCount + quizCount;

  const avgScore =
    recentAttempts.length > 0
      ? Math.round(
          (recentAttempts.reduce((sum, a) => sum + a.score / Math.max(a.totalQuestions, 1), 0) / recentAttempts.length) * 100
        )
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="mt-1 text-sm text-ink-soft">Here&apos;s where your studying stands.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-card-hover"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft">
              <action.icon className="h-4.5 w-4.5 text-accent-dark" />
            </div>
            <span className="text-sm font-medium text-ink">{action.label}</span>
          </Link>
        ))}
      </div>

      {memoryCount > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-ink-faint">Memories in library</p>
            <p className="mt-1 font-display text-2xl text-ink">{memoryCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-ink-faint">Assessments completed</p>
            <p className="mt-1 font-display text-2xl text-ink">{quizAttemptCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-ink-faint">Recent average score</p>
            <p className="mt-1 flex items-center gap-1.5 font-display text-2xl text-ink">
              {avgScore !== null ? `${avgScore}%` : "—"}
              {avgScore !== null && <TrendingUp className="h-4 w-4 text-success" />}
            </p>
          </Card>
        </div>
      )}

      <section>
        <div className="mb-3">
          <h2 className="font-display text-lg text-ink">Memories</h2>
          <p className="mt-0.5 text-sm text-ink-soft">Your recent notes, reviewers, and quizzes in one place.</p>
        </div>
        {memories.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Your study library is empty."
            description="Import your first note to get started."
            actionLabel="Import your first note"
            actionHref="/notes/import"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {memories.map((memory) => {
              const MemoryIcon = memory.icon;
              return <Link key={`${memory.type}-${memory.id}`} href={memory.href} className="card p-4 hover:shadow-card-hover">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-1 text-xs font-medium text-accent-dark">
                      <MemoryIcon className="h-3.5 w-3.5" /> {memory.type}
                    </span>
                    <span className="text-xs text-ink-faint">{formatRelativeTime(memory.updatedAt)}</span>
                  </div>
                  <p className="font-display text-sm text-ink line-clamp-2">{memory.title}</p>
                </Link>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
