"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/shared", label: "Shared with me" },
  { href: "/shared/collections", label: "My collections" },
];

export function SharedNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sharing views" className="flex w-fit gap-1 rounded-lg border border-line bg-surface p-1">
      {links.map((link) => {
        const active = link.href === "/shared" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-action text-action-foreground" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
