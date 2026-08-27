"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Check, Trash2, ExternalLink, ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ResourceType = "NOTE" | "REVIEWER" | "QUIZ";

interface CollectionItem {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
}
interface Collection {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isPublished: boolean;
  items: CollectionItem[];
}
interface PickerRow {
  id: string;
  title: string;
}
interface FeedbackRow {
  id: string;
  authorName: string | null;
  message: string;
  createdAt: string;
}

const TABS: { type: ResourceType; label: string; endpoint: string; listKey: string }[] = [
  { type: "NOTE", label: "Notes", endpoint: "/api/notes?pageSize=100", listKey: "notes" },
  { type: "REVIEWER", label: "Reviewers", endpoint: "/api/reviewers", listKey: "reviewers" },
  { type: "QUIZ", label: "Quizzes", endpoint: "/api/quizzes", listKey: "quizzes" },
];

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [tab, setTab] = useState<ResourceType>("NOTE");
  const [rows, setRows] = useState<Record<ResourceType, PickerRow[]>>({ NOTE: [], REVIEWER: [], QUIZ: [] });
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicUrl = collection ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${collection.slug}` : "";

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/collections/${id}`);
      const data = await res.json().catch(() => null);
      if (data?.collection) setCollection(data.collection);
      else setError(data?.error ?? "Couldn't load this collection.");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const activeTab = TABS.find((t) => t.type === tab)!;
    if (rows[tab].length > 0) return;
    fetch(activeTab.endpoint)
      .then((r) => r.json())
      .then((data) => setRows((prev) => ({ ...prev, [tab]: data[activeTab.listKey] ?? [] })))
      .catch(() => {});
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!collection) return;
    fetch(`/api/collections/public/${collection.slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.collection && setFeedback(data.collection.feedback))
      .catch(() => {});
  }, [collection?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  function isIncluded(resourceType: ResourceType, resourceId: string) {
    return collection?.items.some((i) => i.resourceType === resourceType && i.resourceId === resourceId) ?? false;
  }

  async function toggleItem(resourceType: ResourceType, resourceId: string) {
    if (!collection) return;
    setBusyId(resourceId);
    const existing = collection.items.find((i) => i.resourceType === resourceType && i.resourceId === resourceId);
    try {
      if (existing) {
        await fetch(`/api/collections/${collection.id}/items?itemId=${existing.id}`, { method: "DELETE" });
      } else {
        await fetch(`/api/collections/${collection.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resourceType, resourceId }),
        });
      }
      await load();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setBusyId(null);
  }

  async function togglePublished() {
    if (!collection) return;
    try {
      await fetch(`/api/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !collection.isPublished }),
      });
      await load();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  async function handleDelete() {
    if (!collection || !confirm(`Delete "${collection.title}"? This can't be undone.`)) return;
    try {
      await fetch(`/api/collections/${collection.id}`, { method: "DELETE" });
      router.push("/shared/collections");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (error && !collection) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-danger">{error}</p>
        <Link href="/shared/collections" className="mt-2 inline-block text-sm text-ink-soft underline">
          Back to collections
        </Link>
      </div>
    );
  }

  if (!collection) return <p className="mx-auto max-w-3xl text-sm text-ink-faint">Loading…</p>;

  const counts = { NOTE: 0, REVIEWER: 0, QUIZ: 0 } as Record<ResourceType, number>;
  collection.items.forEach((i) => (counts[i.resourceType] += 1));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/shared/collections" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Collections
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">{collection.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {collection.items.length} item{collection.items.length === 1 ? "" : "s"} selected · viewers can look but
            not edit, and can leave feedback.
          </p>
        </div>
        <Badge tone={collection.isPublished ? "accent" : "neutral"}>{collection.isPublished ? "Published" : "Draft"}</Badge>
      </div>

      <div className="card mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Public link</p>
          <p className="truncate text-sm text-ink">{publicUrl}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={copyLink}>
            {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <ExternalLink className="mr-1.5 h-4 w-4" /> Preview
            </Button>
          </a>
          <Button variant={collection.isPublished ? "ghost" : "primary"} onClick={togglePublished}>
            {collection.isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-medium text-ink">Choose what&apos;s included</h2>
      <div className="mt-2 flex gap-1 rounded-lg border border-line bg-surface p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.type}
            onClick={() => setTab(t.type)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium",
              tab === t.type ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5"
            )}
          >
            {t.label} {counts[t.type] > 0 && `(${counts[t.type]})`}
          </button>
        ))}
      </div>

      <div className="card mt-3 divide-y divide-line">
        {rows[tab].length === 0 ? (
          <p className="p-4 text-sm text-ink-faint">
            No {TABS.find((t) => t.type === tab)!.label.toLowerCase()} yet.
          </p>
        ) : (
          rows[tab].map((row) => {
            const included = isIncluded(tab, row.id);
            return (
              <label key={row.id} className="flex cursor-pointer items-center justify-between gap-3 p-3.5 hover:bg-ink/[0.02]">
                <span className="truncate text-sm text-ink">{row.title}</span>
                <input
                  type="checkbox"
                  checked={included}
                  disabled={busyId === row.id}
                  onChange={() => toggleItem(tab, row.id)}
                  className="h-4 w-4 shrink-0 accent-accent"
                />
              </label>
            );
          })
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <MessageSquare className="h-4 w-4" /> Feedback from viewers ({feedback.length})
        </h2>
      </div>
      {feedback.length === 0 ? (
        <p className="mt-2 text-sm text-ink-faint">Nothing yet — feedback left on your public link will show up here.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {feedback.map((f) => (
            <div key={f.id} className="card p-3.5">
              <p className="text-sm text-ink">{f.message}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {f.authorName || "Anonymous"} · {formatRelativeTime(f.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 border-t border-line pt-5">
        <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={handleDelete}>
          <Trash2 className="mr-1.5 h-4 w-4" /> Delete collection
        </Button>
      </div>
    </div>
  );
}
