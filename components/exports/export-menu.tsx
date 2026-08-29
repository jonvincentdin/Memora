"use client";

import { Download } from "lucide-react";

export interface ExportOption { value: string; label: string }

export function ExportMenu({ options, onExport, label = "Export" }: { options: ExportOption[]; onExport: (format: string) => void | Promise<void>; label?: string }) {
  return <label className="relative inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface pl-3 text-sm text-ink hover:bg-ink/5">
    <Download className="h-3.5 w-3.5" />
    <span className="sr-only">{label}</span>
    <select aria-label={label} defaultValue="" onChange={(event) => { const value = event.target.value; if (value) void onExport(value); event.target.value = ""; }} className="h-full cursor-pointer appearance-none bg-transparent py-0 pl-0 pr-7 text-sm outline-none">
      <option value="" disabled>{label}…</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <span className="pointer-events-none absolute right-2 text-[10px] text-ink-faint">▼</span>
  </label>;
}
