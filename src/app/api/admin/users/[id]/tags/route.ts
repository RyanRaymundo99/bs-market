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
  
  try {
    const tags = await prisma.$queryRaw<Array<{ tag: string }>>`
      SELECT "tag" FROM "user_tag" WHERE "userId" = ${userId}
    `;
    return NextResponse.json({ success: true, tags: tags.map((t) => t.tag) });
  } catch (err) {
    console.error("Error fetching tags via raw SQL:", err);
    return NextResponse.json({ success: true, tags: [] });
  }
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

  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "user_tag" ("userId", "tag")
      VALUES ('${userId}', '${tag}')
      ON CONFLICT ("userId", "tag") DO NOTHING
    `);
    return NextResponse.json({ success: true, tag });
  } catch (err) {
    console.error("Error adding tag via raw SQL:", err);
    return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
  }
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

  try {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "user_tag" WHERE "userId" = '${userId}' AND "tag" = '${tag}'
    `);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting tag via raw SQL:", err);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}
