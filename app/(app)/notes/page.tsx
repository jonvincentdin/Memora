import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { findNoteSummariesByOwner } from "@/lib/notes-repo";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { LibraryNavigation } from "@/components/library/library-navigation";
import { TagList } from "@/components/library/tag-list";

const sourceLabels: Record<string, string> = {
  PDF: "PDF",
  MARKDOWN: "Markdown",
  TXT: "Text file",
  GOOGLE_DOCS: "Google Docs",
  NOTION: "Notion",
  MANUAL: "Manual",
};

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const user = await requireUser();
  const page = Math.max(1, Number(query.page) || 1);
  const notes = await findNoteSummariesByOwner(user.id, { archived: false, page, pageSize: 24 });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Notes</h1>
          <p className="mt-1 text-sm text-ink-soft">Everything you&apos;ve imported, in one library.</p>
        </div>
        <Link
          href="/notes/import"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-action px-4 text-sm font-medium text-action-foreground hover:bg-action/90"
        >
          <Plus className="h-4 w-4" /> Import note
        </Link>
      </div>
      <div className="mb-5"><LibraryNavigation basePath="/notes" page={page} hasNext={notes.length === 24} /></div>

      {notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Your study library is empty."
          description="Import your first note to get started."
          actionLabel="Import your first note"
          actionHref="/notes/import"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Link key={note.id} href={`/notes/${note.id}`} className="card p-4 hover:shadow-card-hover">
              <div className="mb-2 flex items-center justify-between">
                <Badge tone="neutral">{sourceLabels[note.sourceType] ?? note.sourceType}</Badge>
                <span className="text-xs text-ink-faint">{formatRelativeTime(note.updatedAt)}</span>
              </div>
              <p className="font-display text-base text-ink line-clamp-1">{note.title}</p>
              {note.isFavorite && <span className="text-xs text-accent-dark">★ Favorite</span>}
              <p className="mt-1 text-sm text-ink-soft line-clamp-2">
                {note.description || note.originalFilename || "Open this note to view the lesson."}
              </p>
              <TagList tags={note.tags.map(({ tag }) => tag)} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
