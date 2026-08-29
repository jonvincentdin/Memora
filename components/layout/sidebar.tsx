"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, LayoutDashboard, FileText, Layers, ListChecks, GraduationCap, Share2, Settings, Bell, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/reviewers", label: "Reviewers", icon: Layers },
  { href: "/quizzes", label: "Quizzes", icon: ListChecks },
  { href: "/study", label: "Study", icon: GraduationCap },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/shared", label: "Shared with Me", icon: Share2 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-16 items-center gap-2 px-6 font-display text-lg text-ink">
        <BookMarked className="h-5 w-5 text-accent-dark" />
        Memoria
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
