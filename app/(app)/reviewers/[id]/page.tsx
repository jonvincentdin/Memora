import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevel } from "@/lib/permissions";
import { ReviewerDetail } from "@/components/reviewers/reviewer-detail";
import { findReviewerById } from "@/lib/reviewers-repo";

export default async function ReviewerDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const access = await getAccessLevel(user.id, "REVIEWER", params.id);
  if (access === "NONE") notFound();

  const reviewer = await findReviewerById(params.id, { noteLinks: true });
  if (!reviewer) notFound();

  const noteLinks = reviewer.noteLinks as unknown[];

  return (
    <ReviewerDetail
      reviewer={{
        id: reviewer.id,
        title: reviewer.title,
        description: reviewer.description,
        style: reviewer.style,
        content: reviewer.content,
        updatedAt: reviewer.updatedAt.toISOString(),
        noteCount: noteLinks.length,
      }}
      isOwner={access === "OWNER"}
    />
  );
}
