import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevel } from "@/lib/permissions";
import { NoteDetail } from "@/components/notes/note-detail";
import { findNoteById } from "@/lib/notes-repo";

export default async function NoteDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const access = await getAccessLevel(user.id, "NOTE", params.id);
  if (access === "NONE") notFound();

  const note = await findNoteById(params.id);
  if (!note) notFound();

  return (
    <NoteDetail
      note={{
        id: note.id,
        title: note.title,
        description: note.description,
        content: note.content,
        sourceType: note.sourceType,
        updatedAt: note.updatedAt.toISOString(),
      }}
      canEdit={access === "OWNER" || access === "EDIT"}
      isOwner={access === "OWNER"}
    />
  );
}
