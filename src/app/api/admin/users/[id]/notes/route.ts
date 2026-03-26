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
    const notes = await prisma.$queryRaw<Array<{ id: string, adminId: string, note: string, createdAt: any }>>`
      SELECT id, "adminId", note, "createdAt" 
      FROM "user_note" 
      WHERE "userId" = ${userId} 
      ORDER BY "createdAt" DESC
    `;
    return NextResponse.json({ success: true, notes });
  } catch (err) {
    console.error("Error fetching notes via raw SQL:", err);
    return NextResponse.json({ success: true, notes: [] });
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
  const note = typeof body.note === "string" ? body.note.trim() : null;
  if (!note || note.length > 5000) {
    return NextResponse.json({ error: "Note required (max 5000 chars)" }, { status: 400 });
  }

  try {
    const createdAt = new Date().toISOString();
    const id = `note_${Date.now()}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO "user_note" ("id", "userId", "adminId", "note", "createdAt")
      VALUES ('${id}', '${userId}', '${admin.userId}', '${note.replace(/'/g, "''")}', '${createdAt}')
    `);
    
    return NextResponse.json({ 
      success: true, 
      note: { id, userId, adminId: admin.userId, note, createdAt } 
    });
  } catch (err) {
    console.error("Error creating note via raw SQL:", err);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
