"use client";

import { useEffect, useState } from "react";
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
  _count: { items: number; feedback: number };
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/collections");
      const data = await res.json().catch(() => null);
      if (data?.collections) setCollections(data.collections);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!title.trim()) return;
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
        setTitle("");
        setCreating(false);
        await load();
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Public collections</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Bundle specific notes, reviewers, and quizzes into one public, read-only link. Anyone with the link can
            view and leave feedback — nothing they do can change your library.
          </p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Biology Midterm Study Pack"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} loading={saving} disabled={!title.trim()}>
              Create
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}

      {collections === null ? (
        <p className="mt-8 text-sm text-ink-faint">Loading…</p>
      ) : collections.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={FolderOpen}
            title="No public collections yet."
            description="Create one, then pick which notes, reviewers, and quizzes to include."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {collections.map((c) => (
            <Link key={c.id} href={`/shared/collections/${c.id}`} className="card p-4 hover:shadow-card-hover">
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.isPublished ? "bg-success/10 text-success" : "bg-ink/5 text-ink-faint"
                  }`}
                >
                  {c.isPublished ? "Published" : "Draft"}
                </span>
                <span className="text-xs text-ink-faint">{c._count.items} items</span>
              </div>
              <p className="font-display text-base text-ink line-clamp-1">{c.title}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {c._count.feedback} feedback · updated {formatRelativeTime(new Date(c.updatedAt))}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
