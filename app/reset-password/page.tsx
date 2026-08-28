"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-paper" />}><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Couldn't reset your password.");
      setComplete(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't reach the server."); }
    finally { setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-paper px-6"><div className="card w-full max-w-sm p-7"><h1 className="font-display text-xl text-ink">Choose a new password</h1>{complete ? <><p className="mt-4 text-sm text-success">Your password has been updated.</p><Link href="/login" className="mt-4 inline-block text-sm font-medium underline">Sign in</Link></> : <form onSubmit={submit} className="mt-5 space-y-4"><div><Label htmlFor="password">New password</Label><Input id="password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>{error && <p className="text-sm text-danger">{error}</p>}<Button className="w-full" loading={loading}>Reset password</Button></form>}</div></main>;
}
