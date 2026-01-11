import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run all count queries in parallel for maximum performance
    const [
      totalUsers,
      pendingApprovals,
      approvedUsers,
      rejectedUsers,
      pendingKYC,
      approvedKYC,
      rejectedKYC,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { approvalStatus: "PENDING" } }),
      prisma.user.count({ where: { approvalStatus: "APPROVED" } }),
      prisma.user.count({ where: { approvalStatus: "REJECTED" } }),
      prisma.user.count({
        where: {
          kycStatus: "PENDING",
          OR: [
            { documentType: { not: null } },
            { documentFront: { not: null } },
            { documentBack: { not: null } },
            { documentSelfie: { not: null } },
          ],
        },
      }),
      prisma.user.count({
        where: {
          kycStatus: "APPROVED",
          OR: [
            { documentType: { not: null } },
            { documentFront: { not: null } },
            { documentBack: { not: null } },
            { documentSelfie: { not: null } },
          ],
        },
      }),
      prisma.user.count({
        where: {
          kycStatus: "REJECTED",
          OR: [
            { documentType: { not: null } },
            { documentFront: { not: null } },
            { documentBack: { not: null } },
            { documentSelfie: { not: null } },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        pendingApprovals,
        approvedUsers,
        rejectedUsers,
        pendingKYC,
        approvedKYC,
        rejectedKYC,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
