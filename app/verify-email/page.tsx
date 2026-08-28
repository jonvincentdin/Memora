"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  return <Suspense fallback={<main className="min-h-screen bg-paper" />}><VerifyEmail /></Suspense>;
}

function VerifyEmail() {
  const params = useSearchParams();
  const token = params.get("token");
  const sent = params.get("sent") === "1";
  const [status, setStatus] = useState<"working" | "success" | "error">(token ? "working" : sent ? "success" : "error");
  const [message, setMessage] = useState(sent ? "Check your inbox and open the verification link to finish creating your account." : "Missing verification token.");
  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => null) }))
      .then(({ ok, data }) => { setStatus(ok ? "success" : "error"); setMessage(ok ? "Your email is verified. You can now sign in." : data?.error ?? "Verification failed."); })
      .catch(() => { setStatus("error"); setMessage("We couldn't reach the server."); });
  }, [token]);
  return <main className="flex min-h-screen items-center justify-center bg-paper px-6"><div className="card w-full max-w-sm p-7"><h1 className="font-display text-xl text-ink">Verify your email</h1><p className={`mt-4 text-sm ${status === "error" ? "text-danger" : status === "success" ? "text-success" : "text-ink-soft"}`}>{status === "working" ? "Verifying…" : message}</p>{status === "success" && !sent && <Link href="/login" className="mt-4 inline-block text-sm font-medium underline">Sign in</Link>}</div></main>;
}
