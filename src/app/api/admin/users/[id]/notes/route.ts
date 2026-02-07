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
  const notes = await prisma.userNote.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, adminId: true, note: true, createdAt: true },
  });
  return NextResponse.json({ success: true, notes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await validateAdminSession(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await params;
  const body = await request.json();
  const note = typeof body.note === "string" ? body.note.trim() : null;
  if (!note || note.length > 5000) {
    return NextResponse.json({ error: "Note required (max 5000 chars)" }, { status: 400 });
  }

  const created = await prisma.userNote.create({
    data: { userId, adminId: admin.userId, note },
    select: { id: true, adminId: true, note: true, createdAt: true },
  });
  return NextResponse.json({ success: true, note: created });
}
