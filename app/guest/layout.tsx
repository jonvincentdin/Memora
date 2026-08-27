import Link from "next/link";
import { BookMarked } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-display text-lg text-ink">
            <BookMarked className="h-5 w-5 text-accent-dark" />
            Memora
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/register" className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink/90">
              Create a free account
            </Link>
          </div>
        </div>
      </header>
      <div className="border-b border-accent/30 bg-accent-soft/50 px-6 py-2.5 text-center text-sm text-accent-dark">
        You&apos;re in guest mode — nothing you make here is saved.{" "}
        <Link href="/register" className="font-medium underline underline-offset-2">
          Create an account
        </Link>{" "}
        to keep your library.
      </div>
      <main className="px-6 py-10">{children}</main>
    </div>
  );
}
