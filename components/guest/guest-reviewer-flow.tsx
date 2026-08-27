"use client";

import { useState } from "react";
import { Copy, Check, Download, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { FileDropzone } from "@/components/notes/file-dropzone";
import { stripCodeFences } from "@/lib/validation/reviewer";
import { serializeWithFrontmatter } from "@/lib/markdown-frontmatter";
import { exportMarkdownToPdf } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";

const PROCESSING_STYLES = [
  { value: "preserve", label: "Preserve" },
  { value: "balanced", label: "Balanced" },
  { value: "condensed", label: "Condensed" },
  { value: "exam_focused", label: "Exam Focused" },
] as const;

const PLACEHOLDER_NOTE = "[Paste your notes here before sending this prompt to the AI]";

export function GuestReviewerFlow() {
  const [notesText, setNotesText] = useState("");
  const [style, setStyle] = useState<(typeof PROCESSING_STYLES)[number]["value"]>("balanced");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [pastedMarkdown, setPastedMarkdown] = useState("");
  const [title, setTitle] = useState("My reviewer");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError(null);
    setNotice(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/guest/extract", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!data) {
        setError("The server sent back something unexpected. Please try again.");
        setUploading(false);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Couldn't read that file.");
        setUploading(false);
        return;
      }
      setNotesText(data.text);
      setTitle(data.title || "My reviewer");
      if (data.notice) setNotice(data.notice);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setUploading(false);
  }

  async function generatePrompt() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guest/prompts/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "My notes", content: notesText.trim() || PLACEHOLDER_NOTE, style }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't generate prompt.");
        setLoading(false);
        return;
      }
      setPrompt(data.text);
    } catch {
      setError("We couldn't reach the server.");
    }
    setLoading(false);
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const cleanedMarkdown = stripCodeFences(pastedMarkdown);
  const isValidLength = cleanedMarkdown.trim().length >= 20;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="mb-3 text-sm font-medium text-ink">1. Add your notes (optional but recommended)</p>
        <p className="mb-3 text-xs text-ink-soft">
          Paste your notes below, or upload a file — either way they get embedded directly into the prompt.
          Skip this and the prompt will include a placeholder you can fill in yourself inside Claude.
        </p>
        <FileDropzone onFileSelected={handleFileUpload} accept=".md,.txt,.pdf,.docx,.json" />
        {uploading && <p className="mt-2 text-xs text-ink-soft">Reading file…</p>}
        {notice && <p className="mt-2 rounded-lg border border-accent/30 bg-accent-soft/40 p-2.5 text-xs text-accent-dark">{notice}</p>}
        <Textarea
          rows={6}
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder="Paste your raw notes here…"
          className="mt-3 font-mono text-sm"
        />
        <div className="mt-3 flex items-center gap-2">
          {PROCESSING_STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                style === s.value ? "border-accent bg-accent-soft text-accent-dark" : "border-line text-ink-soft hover:bg-ink/5"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <Button className="mt-4" onClick={generatePrompt} loading={loading}>
          Generate prompt
        </Button>
      </div>

      {prompt && (
        <div className="card p-5">
          <p className="mb-2 text-sm font-medium text-ink">2. Copy this and run it in Claude</p>
          <Textarea readOnly rows={10} value={prompt} className="font-mono text-xs" />
          <Button variant="outline" size="sm" className="mt-2" onClick={copyPrompt}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy prompt"}
          </Button>

          <p className="mb-2 mt-5 text-sm font-medium text-ink">3. Paste the AI&apos;s Markdown response</p>
          <Textarea
            rows={8}
            value={pastedMarkdown}
            onChange={(e) => setPastedMarkdown(e.target.value)}
            placeholder="# Reviewer title&#10;&#10;## Section&#10;..."
            className="font-mono text-xs"
          />

          {isValidLength && (
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="guest-reviewer-title">Title</Label>
                <Input id="guest-reviewer-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-line bg-surface p-5">
                <MarkdownRenderer content={cleanedMarkdown} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportMarkdownToPdf(title, cleanedMarkdown)}>
                  <FileText className="h-3.5 w-3.5" /> Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([serializeWithFrontmatter(title, undefined, cleanedMarkdown)], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-3.5 w-3.5" /> Export MD
                </Button>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                <Upload className="h-3.5 w-3.5" /> Want to save this and build quizzes from it later? Create a free account.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
