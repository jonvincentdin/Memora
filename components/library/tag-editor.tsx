"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

type ResourceType = "NOTE" | "REVIEWER" | "QUIZ";
interface Tag { id: string; name: string }

export function TagEditor({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  useEffect(() => { fetch(`/api/tags?resourceType=${resourceType}&resourceId=${resourceId}`).then((response) => response.json()).then((data) => setTags(data.tags ?? [])).catch(() => {}); }, [resourceId, resourceType]);
  async function add() {
    const trimmed = name.trim(); if (!trimmed) return;
    const response = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceId, name: trimmed }) });
    const data = await response.json().catch(() => null); if (response.ok && data?.tag) { setTags((current) => current.some((tag) => tag.id === data.tag.id) ? current : [...current, data.tag]); router.refresh(); } setName("");
  }
  async function remove(tagId: string) { const response = await fetch(`/api/tags?resourceType=${resourceType}&resourceId=${resourceId}&tagId=${tagId}`, { method: "DELETE" }); if (response.ok) { setTags((current) => current.filter((tag) => tag.id !== tagId)); router.refresh(); } }
  return <div className="mt-3 flex flex-wrap items-center gap-2">{tags.map((tag) => <span key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink-soft">{tag.name}<button aria-label={`Remove ${tag.name}`} onClick={() => remove(tag.id)}><X className="h-3 w-3" /></button></span>)}<div className="inline-flex items-center rounded-full border border-line bg-surface"><input aria-label="New tag" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && add()} placeholder="Add tag" className="w-24 bg-transparent px-2 py-1 text-xs outline-none" /><button aria-label="Add tag" onClick={add} className="pr-2"><Plus className="h-3 w-3" /></button></div></div>;
}
