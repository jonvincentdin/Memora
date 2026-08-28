"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Search, Plus, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Topbar({ userName }: { userName: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-6">
      <form onSubmit={handleSearch} className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes, reviewers, quizzes…"
          className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-ink-faint focus:border-accent"
        />
      </form>

      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle className="hidden sm:inline-flex" />
        <Link
          href="/notes/import"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-2.5 text-sm font-medium text-white hover:bg-ink/90 sm:px-3.5"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-medium text-white"
            aria-label="Account menu"
          >
            {userName.charAt(0).toUpperCase()}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 w-48 rounded-lg border border-line bg-surface py-1 shadow-card-hover">
              <div className="border-b border-line px-3 py-2 text-sm text-ink-soft truncate">{userName}</div>
              <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-ink/5">
                <UserIcon className="h-4 w-4" /> Settings
              </Link>
              <button
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  await signOut({ redirect: false });
                  router.replace("/");
                  router.refresh();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger/5"
              >
                <LogOut className="h-4 w-4" /> {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
