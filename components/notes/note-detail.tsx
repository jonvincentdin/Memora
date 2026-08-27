"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Trash2, Sparkles, ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { ShareDialog } from "@/components/sharing/share-dialog";
import { MarkdownEditor } from "@/components/markdown/editor";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { exportMarkdownToPdf } from "@/lib/pdf-export";
import { formatDate } from "@/lib/utils";

interface NoteDetailProps {
  note: {
    id: string;
    title: string;
    description: string | null;
    content: string;
    sourceType: string;
    updatedAt: string;
  };
  canEdit: boolean;
  isOwner: boolean;
}

export function NoteDetail({ note, canEdit, isOwner }: NoteDetailProps) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function handleDelete() {
    await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    router.push("/notes");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/notes" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to notes
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Badge tone="neutral">{note.sourceType}</Badge>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/notes/export?id=${note.id}&format=md`, "_blank")}>
            <Download className="h-3.5 w-3.5" /> MD
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportMarkdownToPdf(note.title, content)}>
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push(`/reviewers?fromNote=${note.id}`)}>
            <Sparkles className="h-3.5 w-3.5" /> Build reviewer
          </Button>
          {isOwner && <ShareDialog resourceType="NOTE" resourceId={note.id} />}
          {isOwner && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                </Button>
              }
              title="Delete this note?"
              description="This can't be undone. Reviewers built from this note will keep their content."
              confirmLabel="Delete"
              destructive
              onConfirm={handleDelete}
            />
          )}
        </div>
      </div>

      {canEdit ? (
        <>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mb-4 font-display text-lg" />
          <Label>Content (Markdown)</Label>
          <MarkdownEditor value={content} onChange={setContent} />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-ink-faint">Last updated {formatDate(note.updatedAt)}</p>
            <Button onClick={handleSave} loading={saving}>
              {saved ? "Saved" : "Save changes"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl text-ink">{note.title}</h1>
          <p className="mt-1 text-xs text-ink-faint">Last updated {formatDate(note.updatedAt)}</p>
          <div className="mt-4 rounded-card border border-line bg-surface p-6">
            <MarkdownRenderer content={note.content} />
          </div>
        </>
      )}
    </div>
  );
}
