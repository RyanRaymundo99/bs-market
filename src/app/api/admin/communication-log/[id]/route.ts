import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await validateAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Missing log id" },
        { status: 400 }
      );
    }

    await prisma.communicationLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Sent email log not found" },
        { status: 404 }
      );
    }
    console.error("Communication log delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete sent email log" },
      { status: 500 }
    );
  }
}
