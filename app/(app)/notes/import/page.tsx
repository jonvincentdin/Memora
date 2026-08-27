"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Link2, FileText } from "lucide-react";
import { FileDropzone } from "@/components/notes/file-dropzone";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "file" | "link";
type Status = "idle" | "processing" | "failed";
type LinkType = "GOOGLE_DOCS" | "NOTION" | "UNKNOWN" | null;

/** Safe client-side link-type detection — never throws on a malformed URL. */
function detectLinkType(rawUrl: string): LinkType {
  if (!rawUrl.trim()) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const { hostname } = new URL(withProtocol);
    if (hostname.includes("docs.google.com")) return "GOOGLE_DOCS";
    if (hostname === "app.notion.com" || hostname.includes("notion.so") || hostname.endsWith(".notion.site")) return "NOTION";
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

const LINK_GUIDANCE: Record<Exclude<LinkType, null>, string> = {
  GOOGLE_DOCS:
    "Direct Google Docs import needs the doc owner's permission and isn't wired up yet. In Google Docs, choose File → Download → Markdown (.md), then paste the contents below or upload the file on the \"Upload File\" tab instead.",
  NOTION:
    "Memora imports only this one page — never the rest of your workspace. Make sure the page is shared with Memora's Notion integration first (••• menu → Connections), then click Import below.",
  UNKNOWN: "We couldn't recognize this as a Google Docs or Notion link — that's fine, just paste the content below.",
};

export default function ImportNotePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("file");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [pastedContent, setPastedContent] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const linkType = useMemo(() => detectLinkType(link), [link]);

  async function handleFileImport() {
    if (!file) return;
    setError(null);
    setNotice(null);
    setStatus("processing");
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/notes/import", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!data) {
        setStatus("failed");
        setError("The server sent back something unexpected. Please try again.");
        return;
      }
      if (!res.ok) {
        setStatus("failed");
        setError(data.error ?? "Import failed.");
        return;
      }
      router.push(`/notes/${data.note.id}`);
    } catch {
      setStatus("failed");
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  async function handleNotionImport() {
    setError(null);
    setNotice(null);
    setStatus("processing");
    try {
      const res = await fetch("/api/notes/import/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!data) {
        setStatus("failed");
        setError("The server sent back something unexpected. Please try again.");
        return;
      }
      if (!res.ok) {
        setStatus("failed");
        setError(data.error ?? "Import failed.");
        return;
      }
      router.push(`/notes/${data.note.id}`);
    } catch {
      setStatus("failed");
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  async function handlePastedSave() {
    setError(null);
    if (!pastedContent.trim()) {
      setError("Paste the note content first.");
      return;
    }

    let resolvedTitle = title.trim();
    if (!resolvedTitle && link.trim()) {
      try {
        const withProtocol = /^https?:\/\//i.test(link) ? link : `https://${link}`;
        resolvedTitle = new URL(withProtocol).hostname;
      } catch {
        resolvedTitle = "Imported note";
      }
    }

    setStatus("processing");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: resolvedTitle || "Imported note", content: pastedContent }),
      });
      const data = await res.json().catch(() => null);
      if (!data) {
        setStatus("failed");
        setError("The server sent back something unexpected. Please try again.");
        return;
      }
      if (!res.ok) {
        setStatus("failed");
        setError(data.error ?? "Import failed.");
        return;
      }
      router.push(`/notes/${data.note.id}`);
    } catch {
      setStatus("failed");
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl text-ink">Import a note</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Bring in material from a file or a link. Notes are stored as Markdown, so headings, bold text, lists, and
        tables all carry over.
      </p>

      <div className="mt-6 flex gap-1 rounded-lg border border-line bg-surface p-1">
        <button
          onClick={() => setTab("file")}
          className={cn("flex-1 rounded-md py-2 text-sm font-medium", tab === "file" ? "bg-ink text-white" : "text-ink-soft")}
        >
          <Upload className="mr-1.5 inline h-4 w-4" /> Upload File
        </button>
        <button
          onClick={() => setTab("link")}
          className={cn("flex-1 rounded-md py-2 text-sm font-medium", tab === "link" ? "bg-ink text-white" : "text-ink-soft")}
        >
          <Link2 className="mr-1.5 inline h-4 w-4" /> Import Link
        </button>
      </div>

      <div className="card mt-4 p-6">
        {tab === "file" ? (
          <>
            <FileDropzone onFileSelected={setFile} accept=".md,.txt,.pdf,.docx,.json" />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
              <FileText className="h-3.5 w-3.5" /> Supports .md, .txt, .pdf, .docx, and Memora&apos;s own exported .json files
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              Only text is imported — if a PDF or Word file has images (like a scanned page), those are skipped and
              you&apos;ll see a notice after importing.
            </p>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            {notice && <p className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-sm text-accent-dark">{notice}</p>}
            {status === "processing" && <p className="mt-3 text-sm text-ink-soft">Extracting content…</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => router.push("/notes")}>
                Cancel
              </Button>
              <Button onClick={handleFileImport} disabled={!file} loading={status === "processing"}>
                Import
              </Button>
            </div>
          </>
        ) : (
          <>
            <Label htmlFor="link">Google Docs or Notion link</Label>
            <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://docs.google.com/… or https://app.notion.com/p/…" />

            {linkType && (
              <p className="mt-2 rounded-lg border border-line bg-ink/[0.02] p-3 text-xs text-ink-soft">
                {LINK_GUIDANCE[linkType]}
              </p>
            )}

            {linkType === "NOTION" ? (
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLink("")}>
                  Clear
                </Button>
                <Button onClick={handleNotionImport} loading={status === "processing"} disabled={!link.trim()}>
                  Import this page
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-4">
                  <Label htmlFor="import-title">Title</Label>
                  <Input id="import-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled note" />
                </div>

                <div className="mt-4">
                  <Label htmlFor="pasted">Paste the exported content (Markdown works best)</Label>
                  <Textarea
                    id="pasted"
                    rows={8}
                    value={pastedContent}
                    onChange={(e) => setPastedContent(e.target.value)}
                    placeholder="# Paste your exported note here…"
                    className="font-mono text-sm"
                  />
                </div>
              </>
            )}

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            {notice && <p className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-sm text-accent-dark">{notice}</p>}

            {linkType !== "NOTION" && (
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => router.push("/notes")}>
                  Cancel
                </Button>
                <Button onClick={handlePastedSave} loading={status === "processing"} disabled={!pastedContent.trim()}>
                  Save note
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
