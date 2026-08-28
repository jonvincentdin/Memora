"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Copy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

type ResourceType = "NOTE" | "REVIEWER" | "QUIZ";

export function ResourceActions({ resourceType, resourceId, archived, favorite }: { resourceType: ResourceType; resourceId: string; archived: boolean; favorite: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function act(action: "archive" | "restore" | "favorite" | "unfavorite" | "duplicate") {
    setBusy(action);
    const response = await fetch("/api/library", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceIds: [resourceId], action }) });
    const data = await response.json().catch(() => null);
    setBusy(null);
    if (!response.ok) return;
    if (action === "duplicate" && data?.created?.id) router.push(`/${resourceType.toLowerCase()}s/${data.created.id}`);
    else router.refresh();
  }
  return <div className="flex items-center gap-1"><Button variant="ghost" size="sm" loading={busy === (favorite ? "unfavorite" : "favorite")} onClick={() => act(favorite ? "unfavorite" : "favorite")}><Star className={`h-3.5 w-3.5 ${favorite ? "fill-accent text-accent-dark" : ""}`} /> {favorite ? "Starred" : "Favorite"}</Button><Button variant="ghost" size="sm" loading={busy === "duplicate"} onClick={() => act("duplicate")}><Copy className="h-3.5 w-3.5" /> Duplicate</Button><Button variant="ghost" size="sm" loading={busy === (archived ? "restore" : "archive")} onClick={() => act(archived ? "restore" : "archive")}>{archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />} {archived ? "Restore" : "Archive"}</Button></div>;
}
