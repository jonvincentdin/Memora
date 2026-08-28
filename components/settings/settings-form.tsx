"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/layout/theme-provider";

interface Settings {
  appearance: "LIGHT" | "DARK" | "SYSTEM";
  defaultQuestionCount: number;
  defaultDifficulty: "EASY" | "NORMAL" | "HARD" | "MIXED";
  showExplanations: boolean;
  autoSave: boolean;
}

export function SettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastSavedQuestionCount = useRef(initial.defaultQuestionCount);
  const { theme, setTheme } = useTheme();

  // The account's stored appearance is the source of truth the first time a
  // signed-in user visits Settings on a given browser (e.g. a fresh device
  // that has no localStorage preference yet). After that, whichever the
  // person picks — here or from the theme toggle anywhere else in the app —
  // wins immediately, both applied client-side and PATCHed to the account.
  useEffect(() => {
    if (typeof window !== "undefined" && !window.localStorage.getItem("memora-theme")) {
      setTheme(initial.appearance);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (patch.appearance) setTheme(patch.appearance);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("save failed");
      if (patch.defaultQuestionCount !== undefined) lastSavedQuestionCount.current = patch.defaultQuestionCount;
    } catch {
      // Appearance already applied locally even if the account sync fails —
      // don't block or roll back the visual change over a flaky save.
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-lg text-ink">Appearance</h2>
        <div className="flex gap-2">
          {(["LIGHT", "DARK", "SYSTEM"] as const).map((a) => (
            <button
              key={a}
              onClick={() => save({ appearance: a })}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm capitalize",
                theme === a ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:bg-ink/5"
              )}
            >
              {a.toLowerCase()}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-faint">Applies immediately on this device, and syncs to your account.</p>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">Default quiz settings</h2>
        <div className="grid max-w-sm gap-4">
          <div>
            <Label htmlFor="qcount">Default question count</Label>
            <input
              id="qcount"
              type="number"
              min={1}
              max={100}
              value={settings.defaultQuestionCount}
              onChange={(e) => setSettings((current) => ({ ...current, defaultQuestionCount: Number(e.target.value) }))}
              onBlur={(e) => {
                const value = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                setSettings((current) => ({ ...current, defaultQuestionCount: value }));
                if (value !== lastSavedQuestionCount.current) void save({ defaultQuestionCount: value });
              }}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="difficulty">Default difficulty</Label>
            <select
              id="difficulty"
              value={settings.defaultDifficulty}
              onChange={(e) => save({ defaultDifficulty: e.target.value as Settings["defaultDifficulty"] })}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
            >
              {["EASY", "NORMAL", "HARD", "MIXED"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">Study preferences</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={settings.showExplanations} onChange={(e) => save({ showExplanations: e.target.checked })} />
            Show explanations after each question
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={settings.autoSave} onChange={(e) => save({ autoSave: e.target.checked })} />
            Auto-save notes and reviewers while editing
          </label>
        </div>
      </section>

      <p className="text-xs text-ink-faint">{saving ? "Saving…" : saved ? "Saved." : ""}</p>
    </div>
  );
}
