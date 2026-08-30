import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/permissions";

const typeSchema = z.enum(["NOTE", "REVIEWER", "QUIZ"]);
const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "Choose a valid tag color.");
const createSchema = z.object({ resourceType: typeSchema, resourceId: z.string(), name: z.string().trim().min(1).max(40), color: colorSchema.optional() });
const updateSchema = z.object({ tagId: z.string(), color: colorSchema });

export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const type = typeSchema.safeParse(url.searchParams.get("resourceType"));
  const resourceId = url.searchParams.get("resourceId");
  if (!type.success || !resourceId || !(await isOwner(user.id, type.data, resourceId))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const tags = type.data === "NOTE" ? (await prisma.noteTag.findMany({ where: { noteId: resourceId }, include: { tag: true } })).map((row) => row.tag)
    : type.data === "REVIEWER" ? (await prisma.reviewerTag.findMany({ where: { reviewerId: resourceId }, include: { tag: true } })).map((row) => row.tag)
    : (await prisma.quizTag.findMany({ where: { quizId: resourceId }, include: { tag: true } })).map((row) => row.tag);
  return NextResponse.json({ tags });
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid tag." }, { status: 400 });
  if (!(await isOwner(user.id, parsed.data.resourceType, parsed.data.resourceId))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const tag = await prisma.tag.upsert({
    where: { ownerId_name: { ownerId: user.id, name: parsed.data.name } },
    create: { ownerId: user.id, name: parsed.data.name, color: parsed.data.color },
    update: parsed.data.color ? { color: parsed.data.color } : {},
  });
  if (parsed.data.resourceType === "NOTE") await prisma.noteTag.upsert({ where: { noteId_tagId: { noteId: parsed.data.resourceId, tagId: tag.id } }, create: { noteId: parsed.data.resourceId, tagId: tag.id }, update: {} });
  else if (parsed.data.resourceType === "REVIEWER") await prisma.reviewerTag.upsert({ where: { reviewerId_tagId: { reviewerId: parsed.data.resourceId, tagId: tag.id } }, create: { reviewerId: parsed.data.resourceId, tagId: tag.id }, update: {} });
  else await prisma.quizTag.upsert({ where: { quizId_tagId: { quizId: parsed.data.resourceId, tagId: tag.id } }, create: { quizId: parsed.data.resourceId, tagId: tag.id }, update: {} });
  return NextResponse.json({ tag }, { status: 201 });
});

export const PATCH = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid tag color." }, { status: 400 });
  const updated = await prisma.tag.updateMany({ where: { id: parsed.data.tagId, ownerId: user.id }, data: { color: parsed.data.color } });
  if (updated.count === 0) return NextResponse.json({ error: "Tag not found." }, { status: 404 });
  const tag = await prisma.tag.findUnique({ where: { id: parsed.data.tagId } });
  return NextResponse.json({ tag });
});

export const DELETE = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const type = typeSchema.safeParse(url.searchParams.get("resourceType"));
  const resourceId = url.searchParams.get("resourceId");
  const tagId = url.searchParams.get("tagId");
  if (!type.success || !resourceId || !tagId || !(await isOwner(user.id, type.data, resourceId))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (type.data === "NOTE") await prisma.noteTag.deleteMany({ where: { noteId: resourceId, tagId } });
  else if (type.data === "REVIEWER") await prisma.reviewerTag.deleteMany({ where: { reviewerId: resourceId, tagId } });
  else await prisma.quizTag.deleteMany({ where: { quizId: resourceId, tagId } });
  return NextResponse.json({ success: true });
});
