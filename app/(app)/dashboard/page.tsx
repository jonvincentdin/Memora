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

  const [recentNotes, recentReviewers, recentQuizzes, recentAttempts, noteCount, quizAttemptCount] = await Promise.all([
    prisma.note.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, title: true, updatedAt: true } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, title: true, updatedAt: true } }),
    prisma.quiz.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, title: true, updatedAt: true } }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 4,
      select: { score: true, totalQuestions: true },
    }),
    prisma.note.count({ where: { ownerId: user.id } }),
    prisma.quizAttempt.count({ where: { userId: user.id, completedAt: { not: null } } }),
  ]);

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

      {noteCount > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-ink-faint">Notes in library</p>
            <p className="mt-1 font-display text-2xl text-ink">{noteCount}</p>
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
        <h2 className="mb-3 font-display text-lg text-ink">Recent notes</h2>
        {recentNotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Your study library is empty."
            description="Import your first note to get started."
            actionLabel="Import your first note"
            actionHref="/notes/import"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentNotes.map((note) => (
              <Link key={note.id} href={`/notes/${note.id}`} className="card p-4 hover:shadow-card-hover">
                <p className="font-display text-sm text-ink line-clamp-1">{note.title}</p>
                <p className="mt-1 text-xs text-ink-faint">{formatRelativeTime(note.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">Recent reviewers</h2>
        {recentReviewers.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Turn your notes into your first reviewer."
            description="Select notes and generate a structured reviewer."
            actionLabel="Create a reviewer"
            actionHref="/reviewers"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentReviewers.map((r) => (
              <Link key={r.id} href={`/reviewers/${r.id}`} className="card p-4 hover:shadow-card-hover">
                <p className="font-display text-sm text-ink line-clamp-1">{r.title}</p>
                <p className="mt-1 text-xs text-ink-faint">{formatRelativeTime(r.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">Recent quizzes &amp; results</h2>
        {recentQuizzes.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Create a quiz from your study material."
            description="Pick notes or reviewers and generate quiz questions."
            actionLabel="Create a quiz"
            actionHref="/quizzes"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentQuizzes.map((q) => (
              <Link key={q.id} href={`/quizzes/${q.id}`} className="card p-4 hover:shadow-card-hover">
                <p className="font-display text-sm text-ink line-clamp-1">{q.title}</p>
                <p className="mt-1 text-xs text-ink-faint">{formatRelativeTime(q.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
