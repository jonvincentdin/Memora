import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { isOwner } from "@/lib/permissions";
import { appUrl } from "@/lib/email";
import { withApiErrorHandling } from "@/lib/api/handler";

function publicUrl(token: string) {
  return appUrl(`/s/${token}`);
}

function readResource(request: Request) {
  const { searchParams } = new URL(request.url);
  return { resourceType: searchParams.get("resourceType"), resourceId: searchParams.get("resourceId") };
}

export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { resourceType, resourceId } = readResource(request);
  if (resourceType !== "NOTE" || !resourceId) return NextResponse.json({ error: "Public links are currently available for notes." }, { status: 400 });
  if (!(await isOwner(user.id, "NOTE", resourceId))) return NextResponse.json({ error: "Note not found." }, { status: 404 });
  const link = await prisma.publicResourceLink.findUnique({ where: { resourceId_resourceType: { resourceId, resourceType: "NOTE" } }, select: { token: true } });
  return NextResponse.json({ url: link ? publicUrl(link.token) : null });
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.resourceType !== "NOTE" || typeof body?.resourceId !== "string") return NextResponse.json({ error: "Public links are currently available for notes." }, { status: 400 });
  if (!(await isOwner(user.id, "NOTE", body.resourceId))) return NextResponse.json({ error: "Note not found." }, { status: 404 });

  const link = await prisma.publicResourceLink.upsert({
    where: { resourceId_resourceType: { resourceId: body.resourceId, resourceType: "NOTE" } },
    update: { ownerId: user.id },
    create: { resourceId: body.resourceId, resourceType: "NOTE", ownerId: user.id, token: randomBytes(24).toString("base64url") },
    select: { token: true },
  });
  return NextResponse.json({ url: publicUrl(link.token) }, { status: 201 });
});

export const DELETE = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.resourceType !== "NOTE" || typeof body?.resourceId !== "string") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!(await isOwner(user.id, "NOTE", body.resourceId))) return NextResponse.json({ error: "Note not found." }, { status: 404 });
  await prisma.publicResourceLink.deleteMany({ where: { resourceId: body.resourceId, resourceType: "NOTE", ownerId: user.id } });
  return NextResponse.json({ success: true });
});
