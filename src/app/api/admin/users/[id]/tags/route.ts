import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

type UserTagDelegate = {
  findMany: (args: { where: { userId: string }; select: { id?: boolean; tag?: boolean } }) => Promise<{ tag: string }[]>;
  upsert: (args: { where: { userId_tag: { userId: string; tag: string } }; create: { userId: string; tag: string }; update: object }) => Promise<unknown>;
  deleteMany: (args: { where: { userId: string; tag: string } }) => Promise<unknown>;
};
type PrismaWithUserTag = typeof prisma & { userTag: UserTagDelegate };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await validateAdminSession(_request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await params;
  const prismaWithTag = prisma as PrismaWithUserTag;
  const tags = await prismaWithTag.userTag.findMany({
    where: { userId },
    select: { tag: true },
  });
  return NextResponse.json({ success: true, tags: tags.map((t) => t.tag) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await validateAdminSession(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await params;
  const body = await request.json();
  const tag = typeof body.tag === "string" ? body.tag.trim().toUpperCase() : null;
  if (!tag || tag.length > 50) {
    return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
  }

  const prismaWithTag = prisma as PrismaWithUserTag;
  await prismaWithTag.userTag.upsert({
    where: { userId_tag: { userId, tag } },
    create: { userId, tag },
    update: {},
  });
  return NextResponse.json({ success: true, tag });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await validateAdminSession(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await params;
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag")?.trim().toUpperCase();
  if (!tag) return NextResponse.json({ error: "Missing tag" }, { status: 400 });

  const prismaWithTag = prisma as PrismaWithUserTag;
  await prismaWithTag.userTag.deleteMany({ where: { userId, tag } });
  return NextResponse.json({ success: true });
}
