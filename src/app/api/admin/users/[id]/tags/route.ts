import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await validateAdminSession(_request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await params;
  const tags = await (prisma as any).userTag.findMany({
    where: { userId },
    select: { id: true, tag: true },
  });
  return NextResponse.json({ success: true, tags: tags.map((t: { tag: string }) => t.tag) });
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

  await (prisma as any).userTag.upsert({
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

  await (prisma as any).userTag.deleteMany({ where: { userId, tag } });
  return NextResponse.json({ success: true });
}
