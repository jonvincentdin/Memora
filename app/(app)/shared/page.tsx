import Link from "next/link";
import { Share2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

const resourceRoutes: Record<string, string> = { NOTE: "/notes", REVIEWER: "/reviewers", QUIZ: "/quizzes" };

export default async function SharedWithMePage() {
  const user = await requireUser();
  const [shares, collectionMemberships] = await Promise.all([
    prisma.resourceShare.findMany({ where: { userId: user.id }, include: { owner: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.shareCollectionMember.findMany({ where: { userId: user.id }, include: { collection: { include: { owner: { select: { name: true, email: true } }, _count: { select: { items: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);

  // Resolve each share's resource title in one batch per type.
  const noteIds = shares.filter((s) => s.resourceType === "NOTE").map((s) => s.resourceId);
  const reviewerIds = shares.filter((s) => s.resourceType === "REVIEWER").map((s) => s.resourceId);
  const quizIds = shares.filter((s) => s.resourceType === "QUIZ").map((s) => s.resourceId);

  const [notes, reviewers, quizzes] = await Promise.all([
    prisma.note.findMany({ where: { id: { in: noteIds } }, select: { id: true, title: true } }),
    prisma.reviewer.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, title: true } }),
    prisma.quiz.findMany({ where: { id: { in: quizIds } }, select: { id: true, title: true } }),
  ]);
  const titleMap = new Map<string, string>();
  [...notes, ...reviewers, ...quizzes].forEach((r) => titleMap.set(r.id, r.title));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl text-ink">Shared with me</h1>
      <p className="mt-1 text-sm text-ink-soft">Resources and private collections other Memoria users have shared with you.</p>

      <div className="mt-4 flex gap-1 rounded-lg border border-line bg-surface p-1 w-fit">
        <span className="rounded-md bg-action px-4 py-1.5 text-sm font-medium text-action-foreground">Shared with me</span>
        <Link href="/shared/collections" className="rounded-md px-4 py-1.5 text-sm font-medium text-ink-soft hover:bg-ink/5">
          My collections
        </Link>
      </div>

      {shares.length === 0 && collectionMemberships.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Share2}
            title="Nothing shared with you yet."
            description="When someone shares a memory, reviewer, or quiz with your account, it'll show up here."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {collectionMemberships.map(({ collection, id, createdAt }) => <Link key={id} href={`/c/${collection.slug}`} className="card p-4 hover:shadow-card-hover"><div className="mb-2 flex items-center justify-between"><Badge tone="accent">COLLECTION</Badge><span className="text-xs text-ink-faint">{collection._count.items} items</span></div><p className="font-display text-base text-ink line-clamp-1">{collection.title}</p><p className="mt-1 text-xs text-ink-faint">Shared by {collection.owner.name || collection.owner.email} · {formatRelativeTime(createdAt)}</p></Link>)}
          {shares.map((share) => {
            const title = titleMap.get(share.resourceId) ?? "(deleted resource)";
            const href = `${resourceRoutes[share.resourceType]}/${share.resourceId}`;
            return (
              <Link key={share.id} href={href} className="card p-4 hover:shadow-card-hover">
                <div className="mb-2 flex items-center justify-between">
                  <Badge tone="neutral">{share.resourceType}</Badge>
                  <Badge tone={share.permission === "EDIT" ? "accent" : "neutral"}>{share.permission}</Badge>
                </div>
                <p className="font-display text-base text-ink line-clamp-1">{title}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  Shared by {share.owner.name || share.owner.email} · {formatRelativeTime(share.createdAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
