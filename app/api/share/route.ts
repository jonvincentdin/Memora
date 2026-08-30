import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { shareResource, revokeShare, isOwner } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import type { ResourceType, Permission } from "@prisma/client";
import { withApiErrorHandling } from "@/lib/api/handler";
import { appUrl, emailDeliveryConfigured, sendTransactionalEmail } from "@/lib/email";
import { z } from "zod";

const VALID_TYPES: ResourceType[] = ["NOTE", "REVIEWER", "QUIZ"];
const VALID_PERMISSIONS: Permission[] = ["VIEW", "EDIT"];

// GET /api/share?resourceType=NOTE&resourceId=... — list current shares (owner only)
export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const resourceType = searchParams.get("resourceType") as ResourceType;
  const resourceId = searchParams.get("resourceId");
  if (!VALID_TYPES.includes(resourceType) || !resourceId) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const owns = await isOwner(user.id, resourceType, resourceId);
  if (!owns) return NextResponse.json({ error: "Resource not found." }, { status: 404 });

  const shares = await prisma.resourceShare.findMany({
    where: { resourceType, resourceId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const invites = await prisma.resourceInvite.findMany({ where: { ownerId: user.id, resourceType, resourceId, expiresAt: { gt: new Date() } }, select: { id: true, email: true, permission: true, expiresAt: true } });

  return NextResponse.json({ shares: [...shares, ...invites.map((invite) => ({ ...invite, pending: true, user: { id: "", name: "Pending invitation", email: invite.email } }))] });
});

// POST { resourceType, resourceId, granteeEmail, permission }
export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const resourceType = body?.resourceType as ResourceType;
  const permission = (VALID_PERMISSIONS.includes(body?.permission) ? body.permission : "VIEW") as Permission;

  if (!VALID_TYPES.includes(resourceType) || !body?.resourceId || !body?.granteeEmail) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsedEmail = z.string().email().safeParse(String(body.granteeEmail).toLowerCase().trim());
  if (!parsedEmail.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const normalizedEmail = parsedEmail.data;
  const grantee = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (!grantee) {
    if (permission === "EDIT") return NextResponse.json({ error: "Edit access can only be given to an existing Memoria user. Choose someone from the search results." }, { status: 404 });
    if (!emailDeliveryConfigured()) return NextResponse.json({ error: "That person does not have a Memoria account yet. Configure email delivery to invite new users." }, { status: 409 });
    if (!(await isOwner(user.id, resourceType, body.resourceId))) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    const invite = await prisma.resourceInvite.upsert({
      where: { resourceId_resourceType_email: { resourceId: body.resourceId, resourceType, email: normalizedEmail } },
      create: { ownerId: user.id, resourceId: body.resourceId, resourceType, email: normalizedEmail, permission, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000) },
      update: { permission, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000) },
    });
    const registerUrl = appUrl(`/register?email=${encodeURIComponent(normalizedEmail)}`);
    await sendTransactionalEmail({ to: normalizedEmail, subject: "You were invited to Memoria", text: `Create your Memoria account with ${normalizedEmail} to open the shared study material: ${registerUrl}`, html: `<p>You were invited to shared study material on Memoria.</p><p><a href="${registerUrl}">Create your account</a> with this email address. The invitation expires in 7 days.</p>` });
    return NextResponse.json({ share: { id: invite.id, permission: invite.permission, pending: true, user: { id: "", name: "Pending invitation", email: normalizedEmail } } }, { status: 201 });
  }

  try {
    const share = await shareResource({
      ownerId: user.id,
      resourceType,
      resourceId: body.resourceId,
      granteeEmail: body.granteeEmail,
      permission,
    });
    return NextResponse.json({ share }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not share resource." }, { status: 400 });
  }
});

// DELETE { resourceType, resourceId, shareId }
export const DELETE = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const resourceType = body?.resourceType as ResourceType;
  if (!VALID_TYPES.includes(resourceType) || !body?.resourceId || !body?.shareId) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.pending) {
    const removed = await prisma.resourceInvite.deleteMany({ where: { id: body.shareId, ownerId: user.id, resourceType, resourceId: body.resourceId } });
    return removed.count ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }
  try {
    await revokeShare({ ownerId: user.id, resourceType, resourceId: body.resourceId, shareId: body.shareId });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not revoke access." }, { status: 400 });
  }
});
