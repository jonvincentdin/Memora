"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type ResourceType = "NOTE" | "REVIEWER";
interface Revision { id: string; createdAt: string; snapshot: { title?: string } }

export function RevisionHistory({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  async function show() { setOpen((value) => !value); if (revisions) return; const response = await fetch(`/api/revisions?resourceType=${resourceType}&resourceId=${resourceId}`); const data = await response.json().catch(() => null); setRevisions(data?.revisions ?? []); }
  async function restore(revisionId: string) { if (!confirm("Restore this version? The current version will remain available in history.")) return; setBusy(revisionId); const response = await fetch("/api/revisions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revisionId }) }); setBusy(null); if (response.ok) { setOpen(false); router.refresh(); } }
  return <div className="relative"><Button variant="ghost" size="sm" onClick={show}><History className="h-3.5 w-3.5" /> History</Button>{open && <div className="absolute right-0 top-10 z-20 max-h-72 w-72 overflow-y-auto rounded-lg border border-line bg-surface p-2 shadow-card-hover">{revisions === null ? <p className="p-2 text-xs text-ink-faint">Loading…</p> : revisions.length === 0 ? <p className="p-2 text-xs text-ink-faint">No earlier versions yet.</p> : revisions.map((revision) => <div key={revision.id} className="flex items-center justify-between gap-2 border-b border-line p-2 last:border-0"><div className="min-w-0"><p className="truncate text-xs font-medium text-ink">{revision.snapshot.title || "Untitled"}</p><p className="text-[11px] text-ink-faint">{formatDate(revision.createdAt)}</p></div><Button variant="outline" size="sm" loading={busy === revision.id} onClick={() => restore(revision.id)}>Restore</Button></div>)}</div>}</div>;
}
