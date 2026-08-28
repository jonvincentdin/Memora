"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock3, Pause, Play, RotateCcw, Settings2, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type TimerMode = "focus" | "shortBreak" | "longBreak";
interface TimerSettings { focus: number; shortBreak: number; longBreak: number; cyclesBeforeLong: number }
interface StoredTimer { settings: TimerSettings; mode: TimerMode; remaining: number; endsAt: number | null; running: boolean; completedFocus: number }

const STORAGE_KEY = "memora-pomodoro-v1";
const DEFAULT_SETTINGS: TimerSettings = { focus: 25, shortBreak: 5, longBreak: 15, cyclesBeforeLong: 4 };
const MODE_LABELS: Record<TimerMode, string> = { focus: "Focus", shortBreak: "Short break", longBreak: "Long break" };

function clamp(value: unknown, minimum: number, maximum: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, Math.round(number))) : fallback;
}

function sanitizeSettings(value: Partial<Record<keyof TimerSettings, unknown>> | undefined): TimerSettings {
  return {
    focus: clamp(value?.focus, 1, 120, DEFAULT_SETTINGS.focus),
    shortBreak: clamp(value?.shortBreak, 1, 60, DEFAULT_SETTINGS.shortBreak),
    longBreak: clamp(value?.longBreak, 1, 90, DEFAULT_SETTINGS.longBreak),
    cyclesBeforeLong: clamp(value?.cyclesBeforeLong, 1, 12, DEFAULT_SETTINGS.cyclesBeforeLong),
  };
}

function durationFor(mode: TimerMode, settings: TimerSettings) {
  return settings[mode] * 60;
}

export function PomodoroTimer() {
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<TimerMode>("focus");
  const [remaining, setRemaining] = useState(DEFAULT_SETTINGS.focus * 60);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [completedFocus, setCompletedFocus] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const finishing = useRef(false);
  const originalTitle = useRef<string | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<StoredTimer> | null;
      if (parsed) {
        const restoredSettings = sanitizeSettings(parsed.settings);
        const restoredMode: TimerMode = ["focus", "shortBreak", "longBreak"].includes(parsed.mode ?? "") ? parsed.mode as TimerMode : "focus";
        const restoredEndsAt = typeof parsed.endsAt === "number" ? parsed.endsAt : null;
        const secondsLeft = restoredEndsAt ? Math.ceil((restoredEndsAt - Date.now()) / 1000) : Number(parsed.remaining);
        const restoredCompleted = clamp(parsed.completedFocus, 0, 100_000, 0);
        setSettings(restoredSettings);
        if (parsed.running && restoredEndsAt && secondsLeft > 0) {
          setMode(restoredMode); setCompletedFocus(restoredCompleted);
          setEndsAt(restoredEndsAt); setRemaining(secondsLeft); setRunning(true);
        } else if (parsed.running && restoredEndsAt && secondsLeft <= 0) {
          const nextCompleted = restoredMode === "focus" ? restoredCompleted + 1 : restoredCompleted;
          const nextMode: TimerMode = restoredMode === "focus" ? (nextCompleted % restoredSettings.cyclesBeforeLong === 0 ? "longBreak" : "shortBreak") : "focus";
          setMode(nextMode); setCompletedFocus(nextCompleted); setRemaining(durationFor(nextMode, restoredSettings));
        } else {
          setMode(restoredMode); setCompletedFocus(restoredCompleted);
          setRemaining(clamp(secondsLeft, 1, 120 * 60, durationFor(restoredMode, restoredSettings)));
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, mode, remaining, endsAt, running, completedFocus } satisfies StoredTimer));
  }, [completedFocus, endsAt, hydrated, mode, remaining, running, settings]);

  useEffect(() => {
    if (!running || !endsAt) return;
    function tick() {
      const next = Math.max(0, Math.ceil((endsAt! - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && !finishing.current) {
        finishing.current = true;
        setRunning(false); setEndsAt(null);
        advance(mode === "focus");
        window.setTimeout(() => { finishing.current = false; }, 0);
      }
    }
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
    // advance reads the current phase settings and completion count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, running]);

  useEffect(() => {
    if (!running) {
      if (originalTitle.current) { document.title = originalTitle.current; originalTitle.current = null; }
      return;
    }
    if (!originalTitle.current) originalTitle.current = document.title;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    document.title = `${minutes}:${String(seconds).padStart(2, "0")} · ${MODE_LABELS[mode]} | Memora`;
  }, [mode, remaining, running]);

  useEffect(() => () => { if (originalTitle.current) document.title = originalTitle.current; }, []);

  function advance(countFocus: boolean) {
    let nextMode: TimerMode;
    if (mode === "focus") {
      if (countFocus) {
        const nextCompleted = completedFocus + 1;
        setCompletedFocus(nextCompleted);
        nextMode = nextCompleted % settings.cyclesBeforeLong === 0 ? "longBreak" : "shortBreak";
      } else nextMode = "shortBreak";
    } else nextMode = "focus";
    setMode(nextMode);
    setRemaining(durationFor(nextMode, settings));
  }

  function toggleRunning() {
    if (running) {
      setRemaining(Math.max(1, Math.ceil(((endsAt ?? Date.now()) - Date.now()) / 1000)));
      setEndsAt(null); setRunning(false);
    } else {
      setEndsAt(Date.now() + remaining * 1000); setRunning(true); setExpanded(true);
    }
  }

  function reset() {
    setRunning(false); setEndsAt(null); setRemaining(durationFor(mode, settings));
  }

  function updateSetting(key: keyof TimerSettings, value: string) {
    const next = sanitizeSettings({ ...settings, [key]: value });
    setSettings(next);
    if (!running && key === mode) setRemaining(durationFor(mode, next));
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const clock = `${minutes}:${String(seconds).padStart(2, "0")}`;

  if (!expanded) return (
    <button type="button" onClick={() => setExpanded(true)} className="fixed bottom-20 right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink shadow-card-hover hover:bg-paper lg:bottom-6 lg:right-6" aria-label={`Open Pomodoro timer, ${clock} remaining`}>
      <Clock3 className={`h-4 w-4 ${running ? "text-accent-dark" : "text-ink-soft"}`} />
      {running ? clock : "Pomodoro"}
    </button>
  );

  return (
    <aside className="fixed bottom-20 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-4 shadow-card-hover lg:bottom-6 lg:right-6" aria-label="Pomodoro timer">
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{MODE_LABELS[mode]}</p><p className="text-xs text-ink-soft">Focus session {completedFocus % settings.cyclesBeforeLong + 1} of {settings.cyclesBeforeLong}</p></div>
        <div className="flex gap-1"><button type="button" onClick={() => setShowSettings((value) => !value)} className="rounded-md p-2 text-ink-soft hover:bg-ink/5" aria-label="Customize timer"><Settings2 className="h-4 w-4" /></button><button type="button" onClick={() => setExpanded(false)} className="rounded-md p-2 text-ink-soft hover:bg-ink/5" aria-label="Collapse timer"><ChevronDown className="h-4 w-4" /></button></div>
      </div>

      <p className="my-4 text-center font-mono text-5xl tabular-nums text-ink" aria-live="polite">{clock}</p>
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={reset} aria-label="Reset current timer"><RotateCcw className="h-4 w-4" /></Button>
        <Button size="sm" onClick={toggleRunning}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{running ? "Pause" : "Start"}</Button>
        <Button variant="outline" size="sm" onClick={() => { setRunning(false); setEndsAt(null); advance(false); }} aria-label="Skip to next phase"><SkipForward className="h-4 w-4" /></Button>
      </div>

      {showSettings && <div className="mt-4 border-t border-line pt-4">
        <div className="mb-3 flex items-center justify-between"><p className="text-sm font-medium text-ink">Customize</p><button type="button" onClick={() => setShowSettings(false)} aria-label="Close settings"><X className="h-4 w-4 text-ink-faint" /></button></div>
        <div className="grid grid-cols-2 gap-3">
          <TimerInput label="Focus minutes" value={settings.focus} max={120} onChange={(value) => updateSetting("focus", value)} />
          <TimerInput label="Short break" value={settings.shortBreak} max={60} onChange={(value) => updateSetting("shortBreak", value)} />
          <TimerInput label="Long break" value={settings.longBreak} max={90} onChange={(value) => updateSetting("longBreak", value)} />
          <TimerInput label="Sessions per cycle" value={settings.cyclesBeforeLong} max={12} onChange={(value) => updateSetting("cyclesBeforeLong", value)} />
        </div>
        <p className="mt-3 text-xs text-ink-faint">Changes are saved on this device. Breaks wait for you to start them.</p>
      </div>}
    </aside>
  );
}

function TimerInput({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: string) => void }) {
  const id = `pomodoro-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <div><Label htmlFor={id} className="text-xs">{label}</Label><Input id={id} type="number" min={1} max={max} value={value} onChange={(event) => onChange(event.target.value)} className="h-9" /></div>;
}
