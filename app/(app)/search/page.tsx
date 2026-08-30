import Link from "next/link";
import { Search, FileText, Layers, ListChecks } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q: rawQuery }, user] = await Promise.all([searchParams, requireUser()]);
  const query = rawQuery?.trim() ?? "";
  const match = query ? { contains: query, mode: "insensitive" as const } : undefined;
  const [notes, reviewers, quizzes] = query ? await Promise.all([
    prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null, OR: [{ title: match }, { description: match }, { originalFilename: match }] }, select: { id: true, title: true, description: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null, OR: [{ title: match }, { description: match }] }, select: { id: true, title: true, description: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
    prisma.quiz.findMany({ where: { ownerId: user.id, archivedAt: null, OR: [{ title: match }, { description: match }] }, select: { id: true, title: true, description: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
  ]) : [[], [], []];
  const sections = [
    { label: "Memories", icon: FileText, rows: notes, path: "/notes" },
    { label: "Reviewers", icon: Layers, rows: reviewers, path: "/reviewers" },
    { label: "Quizzes", icon: ListChecks, rows: quizzes, path: "/quizzes" },
  ];
  const total = notes.length + reviewers.length + quizzes.length;

  return <div className="mx-auto max-w-5xl"><h1 className="font-display text-2xl text-ink">Search</h1><p className="mt-1 text-sm text-ink-soft">{query ? `${total} result${total === 1 ? "" : "s"} for “${query}”` : "Use the search box above to find your study material."}</p>
    {query && total === 0 ? <div className="mt-8"><EmptyState icon={Search} title="No matching study material." description="Try a shorter title, description, or filename." /></div> : <div className="mt-7 space-y-8">{sections.map((section) => section.rows.length > 0 && <section key={section.label}><h2 className="mb-3 flex items-center gap-2 font-display text-lg text-ink"><section.icon className="h-4 w-4 text-accent-dark" />{section.label}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{section.rows.map((row) => <Link key={row.id} href={`${section.path}/${row.id}`} className="card p-4 hover:shadow-card-hover"><p className="font-display text-base text-ink line-clamp-1">{row.title}</p>{row.description && <p className="mt-1 text-sm text-ink-soft line-clamp-2">{row.description}</p>}<p className="mt-2 text-xs text-ink-faint">Updated {formatRelativeTime(row.updatedAt)}</p></Link>)}</div></section>)}</div>}
  </div>;
}
