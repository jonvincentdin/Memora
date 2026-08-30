"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Palette, Plus, X } from "lucide-react";

type ResourceType = "NOTE" | "REVIEWER" | "QUIZ";
interface Tag { id: string; name: string; color: string | null }

const DEFAULT_TAG_COLOR = "#d99a2b";
const SAVED_COLORS_KEY = "memoria-saved-tag-colors";
const TAG_COLOR_PRESETS = [
  { name: "Gold", value: "#d99a2b" },
  { name: "Orange", value: "#ea7c2b" },
  { name: "Red", value: "#dc4c4c" },
  { name: "Rose", value: "#d95f8d" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Teal", value: "#14a3a3" },
  { name: "Green", value: "#3f9b62" },
  { name: "Slate", value: "#64748b" },
  { name: "Brown", value: "#8b6b4a" },
] as const;

export function TagEditor({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR);
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [savedColors, setSavedColors] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/tags?resourceType=${resourceType}&resourceId=${resourceId}`)
      .then((response) => response.json())
      .then((data) => setTags(data.tags ?? []))
      .catch(() => {});
  }, [resourceId, resourceType]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(SAVED_COLORS_KEY) ?? "[]");
      if (Array.isArray(stored)) setSavedColors(stored.filter((color): color is string => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)).slice(0, 5));
    } catch {
      window.localStorage.removeItem(SAVED_COLORS_KEY);
    }

    function closePicker(event: MouseEvent) {
      if (!(event.target instanceof Element) || !event.target.closest("[data-tag-color-picker]")) setActivePicker(null);
    }
    document.addEventListener("mousedown", closePicker);
    return () => document.removeEventListener("mousedown", closePicker);
  }, []);

  function rememberCustomColor(color: string) {
    if (TAG_COLOR_PRESETS.some((preset) => preset.value === color)) return;
    setSavedColors((current) => {
      const next = [color, ...current.filter((saved) => saved !== color)].slice(0, 5);
      window.localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceType, resourceId, name: trimmed, color: newTagColor }),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.tag) {
      setTags((current) => current.some((tag) => tag.id === data.tag.id)
        ? current.map((tag) => tag.id === data.tag.id ? data.tag : tag)
        : [...current, data.tag]);
      router.refresh();
    }
    setName("");
  }

  async function remove(tagId: string) {
    const response = await fetch(`/api/tags?resourceType=${resourceType}&resourceId=${resourceId}&tagId=${tagId}`, { method: "DELETE" });
    if (response.ok) {
      setTags((current) => current.filter((tag) => tag.id !== tagId));
      router.refresh();
    }
  }

  async function updateColor(tagId: string, color: string) {
    const previous = tags;
    setActivePicker(null);
    setTags((current) => current.map((tag) => tag.id === tagId ? { ...tag, color } : tag));
    const response = await fetch("/api/tags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId, color }),
    });
    if (!response.ok) setTags(previous);
    else router.refresh();
  }

  function chooseNewColor(color: string, custom = false) {
    setNewTagColor(color);
    setActivePicker(null);
    if (custom) rememberCustomColor(color);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <span key={tag.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink/5 px-2 py-1 text-xs text-ink-soft">
          <TagColorPicker
            label={`Change ${tag.name} color`}
            value={tag.color ?? DEFAULT_TAG_COLOR}
            open={activePicker === tag.id}
            savedColors={savedColors}
            onToggle={() => setActivePicker((current) => current === tag.id ? null : tag.id)}
            onSelect={(color, custom) => {
              if (custom) rememberCustomColor(color);
              void updateColor(tag.id, color);
            }}
          />
          <span>{tag.name}</span>
          <button type="button" aria-label={`Remove ${tag.name}`} onClick={() => void remove(tag.id)} className="rounded-full p-0.5 hover:bg-ink/10"><X className="h-3 w-3" /></button>
        </span>
      ))}

      <div className="inline-flex items-center rounded-full border border-line bg-surface transition-shadow focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
        <input
          aria-label="New tag"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void add(); } }}
          placeholder="Add tag"
          className="w-24 rounded-l-full bg-transparent px-3 py-1 text-xs outline-none"
        />
        <TagColorPicker
          label="Choose tag color"
          value={newTagColor}
          open={activePicker === "new"}
          savedColors={savedColors}
          onToggle={() => setActivePicker((current) => current === "new" ? null : "new")}
          onSelect={chooseNewColor}
        />
        <button type="button" aria-label="Add tag" onClick={() => void add()} className="mr-1 rounded-full p-1 hover:bg-ink/5"><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function TagColorPicker({ label, value, open, savedColors, onToggle, onSelect }: {
  label: string;
  value: string;
  open: boolean;
  savedColors: string[];
  onToggle: () => void;
  onSelect: (color: string, custom?: boolean) => void;
}) {
  return (
    <div className="relative" data-tag-color-picker>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onToggle}
        className="block h-5 w-5 shrink-0 rounded-full ring-1 ring-inset ring-black/10 transition-transform hover:scale-110"
        style={{ backgroundColor: value }}
      />
      {open && (
        <div role="dialog" aria-label={label} className="absolute left-0 top-7 z-40 w-48 rounded-xl border border-line bg-surface p-3 shadow-card-hover">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Preset colors</p>
          <div className="grid grid-cols-5 gap-2">
            {TAG_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                aria-label={preset.name}
                title={preset.name}
                onClick={() => onSelect(preset.value)}
                className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-surface ${value === preset.value ? "ring-2 ring-ink" : "ring-1 ring-black/10 hover:ring-2 hover:ring-accent"}`}
                style={{ backgroundColor: preset.value }}
              />
            ))}
          </div>

          {savedColors.length > 0 && (
            <>
              <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Saved custom colors</p>
              <div className="flex flex-wrap gap-2">
                {savedColors.map((color) => <button key={color} type="button" aria-label={`Saved color ${color}`} title={color} onClick={() => onSelect(color)} className="h-6 w-6 rounded-full ring-1 ring-black/10 hover:ring-2 hover:ring-accent" style={{ backgroundColor: color }} />)}
              </div>
            </>
          )}

          <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-line pt-3 text-xs font-medium text-ink-soft hover:text-ink">
            <Palette className="h-4 w-4 text-accent-dark" /> Custom color
            <input type="color" aria-label={`${label}: custom color`} value={value} onChange={(event) => onSelect(event.target.value, true)} className="ml-auto h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
          </label>
        </div>
      )}
    </div>
  );
}
