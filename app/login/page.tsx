"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { loginSchema } from "@/lib/validation/auth";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setLoading(true);
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      keepLoggedIn: keepLoggedIn ? "true" : "false",
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      setError("That email and password don't match an account.");
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-display text-lg text-ink">
          <BookMarked className="h-5 w-5 text-accent-dark" />
          Memoria
        </Link>
        <div className="card p-7">
          <h1 className="font-display text-xl text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">Sign in to keep studying where you left off.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={keepLoggedIn}
                    onChange={(event) => setKeepLoggedIn(event.target.checked)}
                    className="h-4 w-4 rounded border-line accent-accent"
                  />
                  Keep me logged in
                </label>
                <Link href="/forgot-password" className="text-xs text-ink-soft hover:text-ink hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            New to Memoria?{" "}
            <Link href="/register" className="font-medium text-ink hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
