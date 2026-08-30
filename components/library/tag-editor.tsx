"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

type ResourceType = "NOTE" | "REVIEWER" | "QUIZ";
interface Tag { id: string; name: string; color: string | null }

const DEFAULT_TAG_COLOR = "#d99a2b";

export function TagEditor({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR);
  useEffect(() => { fetch(`/api/tags?resourceType=${resourceType}&resourceId=${resourceId}`).then((response) => response.json()).then((data) => setTags(data.tags ?? [])).catch(() => {}); }, [resourceId, resourceType]);
  async function add() {
    const trimmed = name.trim(); if (!trimmed) return;
    const response = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceId, name: trimmed, color: newTagColor }) });
    const data = await response.json().catch(() => null); if (response.ok && data?.tag) { setTags((current) => current.some((tag) => tag.id === data.tag.id) ? current : [...current, data.tag]); router.refresh(); } setName("");
  }
  async function remove(tagId: string) { const response = await fetch(`/api/tags?resourceType=${resourceType}&resourceId=${resourceId}&tagId=${tagId}`, { method: "DELETE" }); if (response.ok) { setTags((current) => current.filter((tag) => tag.id !== tagId)); router.refresh(); } }
  async function updateColor(tagId: string, color: string) {
    const previous = tags;
    setTags((current) => current.map((tag) => tag.id === tagId ? { ...tag, color } : tag));
    const response = await fetch("/api/tags", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tagId, color }) });
    if (!response.ok) setTags(previous);
    else router.refresh();
  }
  return <div className="mt-3 flex flex-wrap items-center gap-2">{tags.map((tag) => <span key={tag.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink/5 px-2 py-1 text-xs text-ink-soft"><label className="relative h-4 w-4 shrink-0 cursor-pointer rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: tag.color ?? DEFAULT_TAG_COLOR }} title={`Change ${tag.name} color`}><input type="color" aria-label={`Change ${tag.name} color`} value={tag.color ?? DEFAULT_TAG_COLOR} onChange={(event) => updateColor(tag.id, event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label><span>{tag.name}</span><button type="button" aria-label={`Remove ${tag.name}`} onClick={() => remove(tag.id)} className="rounded-full p-0.5 hover:bg-ink/10"><X className="h-3 w-3" /></button></span>)}<div className="inline-flex items-center rounded-full border border-line bg-surface transition-shadow focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30"><input aria-label="New tag" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder="Add tag" className="w-24 rounded-l-full bg-transparent px-3 py-1 text-xs outline-none" /><label className="relative mr-1 h-5 w-5 shrink-0 cursor-pointer rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: newTagColor }} title="Choose tag color"><input type="color" aria-label="Choose tag color" value={newTagColor} onChange={(event) => setNewTagColor(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label><button type="button" aria-label="Add tag" onClick={add} className="mr-1 rounded-full p-1 hover:bg-ink/5"><Plus className="h-3.5 w-3.5" /></button></div></div>;
}
