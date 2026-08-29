"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";

interface CollectionSummary {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isPublished: boolean;
  updatedAt: string;
  _count: { items: number; feedback: number; members: number };
}

export function CollectionsList({ initialCollections }: { initialCollections: CollectionSummary[] }) {
  const [collections, setCollections] = useState(initialCollections);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!data) {
        setError("The server sent back something unexpected. Please try again.");
      } else if (!res.ok) {
        setError(data.error ?? "Couldn't create collection.");
      } else {
        setCollections((current) => [
          { ...data.collection, updatedAt: new Date(data.collection.updatedAt).toISOString(), _count: { items: 0, feedback: 0, members: 0 } },
          ...current,
        ]);
        setTitle("");
        setCreating(false);
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Collections</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Bundle notes, reviewers, and quizzes, then share privately with specific people or publish a read-only link.
          </p>
        </div>
        <Button onClick={() => setCreating((value) => !value)}>
          <Plus className="mr-1.5 h-4 w-4" /> New collection
        </Button>
      </div>

      {creating && (
        <div className="card mt-4 p-5">
          <Label htmlFor="new-collection-title">Collection title</Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="new-collection-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Biology Midterm Study Pack"
              onKeyDown={(event) => event.key === "Enter" && handleCreate()}
              autoFocus
            />
            <Button onClick={handleCreate} loading={saving} disabled={!title.trim()}>
              Create
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}

      {collections.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={FolderOpen}
            title="No collections yet."
            description="Create one, then pick which notes, reviewers, and quizzes to include."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {collections.map((collection) => (
            <Link key={collection.id} href={`/shared/collections/${collection.id}`} className="card p-4 hover:shadow-card-hover">
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    collection.isPublished ? "bg-success/10 text-success" : "bg-ink/5 text-ink-faint"
                  }`}
                >
                  {collection.isPublished ? "Published" : "Draft"}
                </span>
                <span className="text-xs text-ink-faint">{collection._count.items} items</span>
              </div>
              <p className="font-display text-base text-ink line-clamp-1">{collection.title}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {collection._count.members} private · {collection._count.feedback} feedback · updated {formatRelativeTime(new Date(collection.updatedAt))}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
