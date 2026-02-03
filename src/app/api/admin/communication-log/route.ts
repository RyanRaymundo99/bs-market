import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function GET(request: NextRequest) {
  try {
    const admin = await validateAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10),
      500
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const [logs, total] = await Promise.all([
      prisma.communicationLog.findMany({
        orderBy: { sentAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.communicationLog.count(),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Communication log fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sent emails" },
      { status: 500 }
    );
  }
}
