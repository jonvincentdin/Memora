import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { shareResource, revokeShare, isOwner } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import type { ResourceType, Permission } from "@prisma/client";
import { withApiErrorHandling } from "@/lib/api/handler";

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

  return NextResponse.json({ shares });
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

  try {
    await revokeShare({ ownerId: user.id, resourceType, resourceId: body.resourceId, shareId: body.shareId });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not revoke access." }, { status: 400 });
  }
});
