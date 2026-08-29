"use client";

import { useEffect, useState } from "react";
import { LogOut, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SessionConflictModal({ userName, sessionId }: { userName: string; sessionId: string }) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<"logout_other" | "continue" | null>(null);
  useEffect(() => { if (window.sessionStorage.getItem("memoria-session-resolved") === sessionId) setOpen(false); }, [sessionId]);
  if (!open) return null;
  async function resolve(action: "logout_other" | "continue") {
    setBusy(action);
    const response = await fetch("/api/sessions/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, sessionId }) });
    if (response.ok) { window.sessionStorage.setItem("memoria-session-resolved", sessionId); setOpen(false); }
    setBusy(null);
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/25 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="session-conflict-title"><div className="card w-full max-w-md p-6 text-center shadow-card-hover"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-dark"><UserCheck className="h-5 w-5" /></span><h2 id="session-conflict-title" className="mt-4 font-display text-xl text-ink">{userName} is currently logged in.</h2><p className="mt-2 text-sm text-ink-soft">Memoria detected another active session for this account. Choose how you want to continue.</p><div className="mt-6 grid gap-2"><Button onClick={() => resolve("logout_other")} loading={busy === "logout_other"}><LogOut className="h-4 w-4" /> Log out the other session</Button><Button variant="outline" onClick={() => resolve("continue")} loading={busy === "continue"}>Continue as {userName}</Button></div></div></div>;
}
