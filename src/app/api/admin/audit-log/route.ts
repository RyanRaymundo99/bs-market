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
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const resourceType = searchParams.get("resourceType") || undefined;
    const adminId = searchParams.get("adminId") || undefined;
    const resourceId = searchParams.get("resourceId") || undefined;

    const where: {
      resourceType?: string;
      adminId?: string;
      resourceId?: string;
    } = {};
    if (resourceType) where.resourceType = resourceType;
    if (adminId) where.adminId = adminId;
    if (resourceId) where.resourceId = resourceId;

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Audit log fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 }
    );
  }
}
