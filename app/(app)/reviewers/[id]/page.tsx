import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevelForOwner } from "@/lib/permissions";
import { ReviewerDetail } from "@/components/reviewers/reviewer-detail";
import { findReviewerById } from "@/lib/reviewers-repo";

export default async function ReviewerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireUser();
  const reviewer = await findReviewerById(params.id, { noteLinks: true });
  if (!reviewer) notFound();
  const access = await getAccessLevelForOwner(user.id, "REVIEWER", params.id, reviewer.ownerId);
  if (access === "NONE") notFound();

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
