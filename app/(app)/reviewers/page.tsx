import Link from "next/link";
import { Layers } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ReviewerWizardLauncher } from "@/components/reviewers/reviewer-wizard-launcher";
import { formatRelativeTime } from "@/lib/utils";
import { LibraryNavigation } from "@/components/library/library-navigation";

export default async function ReviewersPage(props: { searchParams: Promise<{ create?: string; fromNote?: string; source?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [reviewers, notes] = await Promise.all([
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 24, take: 24, select: { id: true, title: true, description: true, style: true, updatedAt: true, isFavorite: true } }),
    prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Reviewers</h1>
          <p className="mt-1 text-sm text-ink-soft">Structured study material built from your notes.</p>
        </div>
        <ReviewerWizardLauncher key={`${searchParams.create}-${searchParams.source}-${searchParams.fromNote}`} notes={notes} defaultNoteId={searchParams.fromNote} initiallyOpen={searchParams.create === "1"} initialPath={searchParams.source === "import" ? "import" : searchParams.source === "notes" ? "notes" : undefined} />
      </div>
      <LibraryNavigation basePath="/reviewers" page={page} hasNext={reviewers.length === 24} />

      {reviewers.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Turn your notes into your first reviewer."
          description="Select notes above and generate a structured reviewer."
          actionLabel={notes.length > 0 ? "Choose from existing notes" : "Import a note first"}
          actionHref={notes.length > 0 ? "/reviewers?create=1&source=notes" : "/notes/import"}
          secondaryActionLabel="Import reviewer"
          secondaryActionHref="/reviewers?create=1&source=import"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reviewers.map((r) => (
            <Link key={r.id} href={`/reviewers/${r.id}`} className="card p-4 hover:shadow-card-hover">
              <div className="mb-2 flex items-center justify-between">
                <Badge tone="accent">{r.style}</Badge>
                <span className="text-xs text-ink-faint">{formatRelativeTime(r.updatedAt)}</span>
              </div>
              <p className="font-display text-base text-ink line-clamp-1">{r.title}</p>
              {r.isFavorite && <span className="text-xs text-accent-dark">★ Favorite</span>}
              {r.description && <p className="mt-1 text-sm text-ink-soft line-clamp-2">{r.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
