"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2, X, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ShareRow {
  id: string;
  permission: "VIEW" | "EDIT";
  user: { id: string; name: string; email: string };
  pending?: boolean;
}

export function ShareDialog({ resourceType, resourceId }: { resourceType: "NOTE" | "REVIEWER" | "QUIZ"; resourceId: string }) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"VIEW" | "EDIT">("VIEW");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/share?resourceType=${resourceType}&resourceId=${resourceId}`)
      .then((r) => r.json())
      .then((d) => setShares(d.shares ?? []))
      .catch(() => setError("We couldn't reach the server. Check your connection and try again."));
  }, [open, resourceType, resourceId]);

  async function handleShare() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType, resourceId, granteeEmail: email, permission }),
      });
      const data = await res.json().catch(() => null);
      if (!data) {
        setError("The server sent back something unexpected. Please try again.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Couldn't share.");
        return;
      }
      setEmail("");
      setShares((prev) => [...prev.filter((s) => s.id !== data.share.id), data.share]);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(shareId: string, pending = false) {
    await fetch("/api/share", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceType, resourceId, shareId, pending }),
    });
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-ink hover:bg-ink/5"
      >
        <Share2 className="h-3.5 w-3.5" /> Share
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">Share</h3>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4 text-ink-faint" /></button>
            </div>

            <Label htmlFor="grantee-email">Invite by email</Label>
            <div className="flex gap-2">
              <Input id="grantee-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as "VIEW" | "EDIT")}
                className="h-10 rounded-lg border border-line bg-surface px-2 text-sm"
              >
                <option value="VIEW">View</option>
                <option value="EDIT">Edit</option>
              </select>
            </div>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            <Button size="sm" className="mt-3 w-full" onClick={handleShare} loading={loading} disabled={!email.trim()}>
              Share
            </Button>

            {shares.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-line pt-4">
                {shares.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-ink">{s.user.name || s.user.email}</p>
                      <Badge tone={s.permission === "EDIT" ? "accent" : "neutral"}>{s.pending ? "PENDING" : s.permission}</Badge>
                    </div>
                    <button onClick={() => handleRevoke(s.id, s.pending)} className="text-ink-faint hover:text-danger">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-line pt-4">
              <Link href="/shared/collections" className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
                <Layers className="h-3.5 w-3.5" /> Or add this to a collection
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
