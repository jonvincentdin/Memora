import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevelForOwner } from "@/lib/permissions";
import { NoteDetail } from "@/components/notes/note-detail";
import { findNoteById } from "@/lib/notes-repo";

export default async function NoteDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireUser();
  const note = await findNoteById(params.id);
  if (!note) notFound();
  const access = await getAccessLevelForOwner(user.id, "NOTE", params.id, note.ownerId);
  if (access === "NONE") notFound();

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
