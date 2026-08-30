"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";

export interface ExportOption { value: string; label: string }

export function ExportMenu({ options, onExport, label = "Export" }: { options: ExportOption[]; onExport: (format: string) => void | Promise<void>; label?: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return <div ref={menuRef} className="relative inline-block">
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm text-ink transition-colors hover:border-accent hover:bg-accent-soft focus-visible:ring-accent"
    >
      <Download className="h-3.5 w-3.5" />
      <span>{label}…</span>
      <ChevronDown className={`ml-1 h-3.5 w-3.5 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
    </button>

    {open && <div role="menu" aria-label={`${label} format`} className="absolute left-0 z-50 mt-1 min-w-48 overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-card-hover">
      {options.map((option) => <button
        key={option.value}
        type="button"
        role="menuitem"
        onClick={() => {
          setOpen(false);
          void onExport(option.value);
        }}
        className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-accent-soft hover:text-ink focus:bg-accent-soft focus:text-ink focus:outline-none"
      >
        {option.label}
      </button>)}
    </div>}
  </div>;
}
