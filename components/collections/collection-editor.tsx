"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Check, Trash2, ExternalLink, ArrowLeft, MessageSquare, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime, cn } from "@/lib/utils";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ExportMenu } from "@/components/exports/export-menu";

type ResourceType = "NOTE" | "REVIEWER" | "QUIZ";
interface CollectionItem { id: string; resourceType: ResourceType; resourceId: string }
interface Collection {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isPublished: boolean;
  expiresAt: string | null;
  passwordProtected: boolean;
  items: CollectionItem[];
  members: Array<{ id: string; name: string; email: string }>;
}
interface PickerRow { id: string; title: string }
interface FeedbackRow { id: string; authorName: string | null; message: string; createdAt: string }

const TABS: { type: ResourceType; label: string }[] = [
  { type: "NOTE", label: "Notes" },
  { type: "REVIEWER", label: "Reviewers" },
  { type: "QUIZ", label: "Quizzes" },
];

export function CollectionEditor({
  initialCollection,
  rows,
  initialFeedback,
}: {
  initialCollection: Collection;
  rows: Record<ResourceType, PickerRow[]>;
  initialFeedback: FeedbackRow[];
}) {
  const router = useRouter();
  const [collection, setCollection] = useState(initialCollection);
  const [tab, setTab] = useState<ResourceType>("NOTE");
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [title, setTitle] = useState(initialCollection.title);
  const [description, setDescription] = useState(initialCollection.description ?? "");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState(initialCollection.expiresAt?.slice(0, 10) ?? "");
  const [savingSettings, setSavingSettings] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [sharingPrivately, setSharingPrivately] = useState(false);
  const [highlightedFeedback, setHighlightedFeedback] = useState<string | null>(null);

  useEffect(() => {
    const feedbackId = new URLSearchParams(window.location.search).get("feedback");
    if (!feedbackId) return;
    setHighlightedFeedback(feedbackId);
    window.setTimeout(() => document.getElementById(`feedback-${feedbackId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    window.setTimeout(() => setHighlightedFeedback(null), 4000);
  }, []);
  const publicPath = `/c/${collection.slug}`;

  function isIncluded(resourceType: ResourceType, resourceId: string) {
    return collection.items.some((item) => item.resourceType === resourceType && item.resourceId === resourceId);
  }

  async function toggleItem(resourceType: ResourceType, resourceId: string) {
    const busyKey = `${resourceType}:${resourceId}`;
    setBusyId(busyKey);
    setError(null);
    const existing = collection.items.find((item) => item.resourceType === resourceType && item.resourceId === resourceId);
    try {
      const response = existing
        ? await fetch(`/api/collections/${collection.id}/items?itemId=${existing.id}`, { method: "DELETE" })
        : await fetch(`/api/collections/${collection.id}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resourceType, resourceId }),
          });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Couldn't update this collection.");
      setCollection((current) => ({
        ...current,
        items: existing ? current.items.filter((item) => item.id !== existing.id) : [...current.items, data.item],
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function togglePublished() {
    if (publishing) return;
    setPublishing(true);
    setError(null);
    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !collection.isPublished }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Couldn't update this collection.");
      setCollection((current) => ({ ...current, isPublished: data.collection.isPublished }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${collection.title}"? This can't be undone.`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/collections/${collection.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Couldn't delete this collection.");
      router.replace("/shared/collections");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't reach the server. Check your connection and try again.");
    }
  }

  async function saveSettings() {
    setSavingSettings(true); setError(null);
    try {
      const response = await fetch(`/api/collections/${collection.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), description: description.trim(), password: password || undefined, expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59.999Z`).toISOString() : null }) });
      const data = await response.json().catch(() => null); if (!response.ok) throw new Error(data?.error ?? "Couldn't save collection settings.");
      setCollection((current) => ({ ...current, title: data.collection.title, description: data.collection.description, expiresAt: data.collection.expiresAt, passwordProtected: password ? true : current.passwordProtected })); setPassword("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't reach the server."); }
    finally { setSavingSettings(false); }
  }

  async function clearPassword() {
    const response = await fetch(`/api/collections/${collection.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: null }) });
    if (response.ok) setCollection((current) => ({ ...current, passwordProtected: false }));
  }

  async function moveItem(itemId: string, direction: -1 | 1) {
    const index = collection.items.findIndex((item) => item.id === itemId); const target = index + direction;
    if (index < 0 || target < 0 || target >= collection.items.length) return;
    const next = [...collection.items]; [next[index], next[target]] = [next[target], next[index]]; setCollection((current) => ({ ...current, items: next }));
    const response = await fetch(`/api/collections/${collection.id}/items`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemIds: next.map((item) => item.id) }) });
    if (!response.ok) setCollection((current) => ({ ...current, items: collection.items }));
  }

  async function removeFeedback(feedbackId: string) {
    const response = await fetch(`/api/collections/${collection.id}/feedback?feedbackId=${feedbackId}`, { method: "DELETE" });
    if (response.ok) setFeedback((current) => current.filter((item) => item.id !== feedbackId));
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function exportCollection(format: string) {
    if (format === "json") { window.location.href = `/api/collections/${collection.id}/export?format=json`; return; }
    const response = await fetch(`/api/collections/${collection.id}/export`);
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.error ?? "Couldn't export this collection."); return; }
    if (format === "pdf") { const { exportMarkdownToPdf } = await import("@/lib/pdf-export"); exportMarkdownToPdf(data.title, data.markdown); }
    if (format === "docx") { const { exportMarkdownToWord } = await import("@/lib/word-export"); await exportMarkdownToWord(data.title, data.markdown); }
  }

  async function addMember() {
    if (!memberEmail.trim()) return;
    setSharingPrivately(true); setError(null);
    const response = await fetch(`/api/collections/${collection.id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: memberEmail.trim() }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) setError(data?.error ?? "Couldn't share this collection.");
    else {
      setCollection((current) => ({ ...current, members: current.members.some((member) => member.id === data.member.id) ? current.members : [...current.members, { id: data.member.id, name: data.member.user.name, email: data.member.user.email }] }));
      setMemberEmail("");
    }
    setSharingPrivately(false);
  }

  async function removeMember(memberId: string) {
    const response = await fetch(`/api/collections/${collection.id}/members?memberId=${memberId}`, { method: "DELETE" });
    if (response.ok) setCollection((current) => ({ ...current, members: current.members.filter((member) => member.id !== memberId) }));
  }

  const counts = { NOTE: 0, REVIEWER: 0, QUIZ: 0 } as Record<ResourceType, number>;
  collection.items.forEach((item) => (counts[item.resourceType] += 1));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/shared/collections" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Collections
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">{collection.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {collection.items.length} item{collection.items.length === 1 ? "" : "s"} selected · viewers can look but not edit, and can leave feedback.
          </p>
        </div>
        <Badge tone={collection.isPublished ? "accent" : "neutral"}>{collection.isPublished ? "Published" : "Draft"}</Badge>
        <ExportMenu options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word document" }, { value: "json", label: "Memoria JSON" }]} onExport={exportCollection} />
      </div>

      <div className="card mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Public link</p>
          <p className="truncate text-sm text-ink">{publicPath}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={copyLink}>
            {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <a href={publicPath} target="_blank" rel="noreferrer">
            <Button variant="outline"><ExternalLink className="mr-1.5 h-4 w-4" /> Preview</Button>
          </a>
          <Button variant={collection.isPublished ? "ghost" : "primary"} onClick={togglePublished} loading={publishing}>
            {collection.isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="card mt-5 p-5">
        <h2 className="font-display text-lg text-ink">Private sharing</h2>
        <p className="mt-1 text-sm text-ink-soft">Give specific Memoria users access without publishing the link. They receive a notification immediately.</p>
        <div className="mt-4 flex gap-2"><Input type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addMember()} placeholder="person@example.com" aria-label="User email" /><Button onClick={addMember} loading={sharingPrivately} disabled={!memberEmail.trim()}>Share</Button></div>
        {collection.members.length > 0 && <div className="mt-4 divide-y divide-line rounded-lg border border-line">{collection.members.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{member.name}</p><p className="truncate text-xs text-ink-faint">{member.email}</p></div><button onClick={() => removeMember(member.id)} className="text-xs font-medium text-danger hover:underline">Remove</button></div>)}</div>}
      </div>

      <div className="card mt-5 p-5"><h2 className="font-display text-lg text-ink">Collection settings</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="collection-title">Title</Label><Input id="collection-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div><Label htmlFor="collection-expiry">Link expires (optional)</Label><Input id="collection-expiry" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></div><div className="sm:col-span-2"><Label htmlFor="collection-description">Description</Label><Textarea id="collection-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></div><div><Label htmlFor="collection-password">{collection.passwordProtected ? "Replace password" : "Password (optional)"}</Label><Input id="collection-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></div></div><div className="mt-4 flex gap-2"><Button onClick={saveSettings} loading={savingSettings}>Save settings</Button>{collection.passwordProtected && <Button variant="ghost" onClick={clearPassword}>Remove password</Button>}</div></div>

      <h2 className="mt-8 text-sm font-medium text-ink">Choose what&apos;s included</h2>
      <div className="mt-2 flex w-fit gap-1 rounded-lg border border-line bg-surface p-1">
        {TABS.map((item) => (
          <button
            key={item.type}
            onClick={() => setTab(item.type)}
            className={cn("rounded-md px-4 py-1.5 text-sm font-medium", tab === item.type ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5")}
          >
            {item.label} {counts[item.type] > 0 && `(${counts[item.type]})`}
          </button>
        ))}
      </div>

      {collection.items.length > 1 && <div className="card mt-5 divide-y divide-line"><p className="p-3 text-xs font-medium uppercase tracking-wide text-ink-faint">Public display order</p>{collection.items.map((item, index) => { const row = rows[item.resourceType].find((candidate) => candidate.id === item.resourceId); return <div key={item.id} className="flex items-center justify-between gap-3 p-3"><span className="truncate text-sm text-ink">{row?.title ?? "Removed resource"}</span><div className="flex"><button aria-label="Move up" disabled={index === 0} onClick={() => moveItem(item.id, -1)} className="p-1 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button><button aria-label="Move down" disabled={index === collection.items.length - 1} onClick={() => moveItem(item.id, 1)} className="p-1 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button></div></div>; })}</div>}

      <div className="card mt-3 divide-y divide-line">
        {rows[tab].length === 0 ? (
          <p className="p-4 text-sm text-ink-faint">No {TABS.find((item) => item.type === tab)!.label.toLowerCase()} yet.</p>
        ) : rows[tab].map((row) => {
          const included = isIncluded(tab, row.id);
          return (
            <label key={row.id} className="flex cursor-pointer items-center justify-between gap-3 p-3.5 hover:bg-ink/[0.02]">
              <span className="truncate text-sm text-ink">{row.title}</span>
              <input
                type="checkbox"
                checked={included}
                disabled={busyId === `${tab}:${row.id}`}
                onChange={() => toggleItem(tab, row.id)}
                className="h-4 w-4 shrink-0 accent-accent"
              />
            </label>
          );
        })}
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
          {feedback.map((item) => (
            <div id={`feedback-${item.id}`} key={item.id} className={cn("card flex items-start justify-between gap-3 p-3.5 transition-shadow", highlightedFeedback === item.id && "ring-2 ring-accent")}>
              <div><p className="text-sm text-ink">{item.message}</p><p className="mt-1 text-xs text-ink-faint">{item.authorName || "Anonymous"} · {formatRelativeTime(item.createdAt)}</p></div>
              <button aria-label="Delete feedback" className="text-ink-faint hover:text-danger" onClick={() => removeFeedback(item.id)}><Trash2 className="h-4 w-4" /></button>
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
