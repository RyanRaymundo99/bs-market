import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Update user KYC status to rejected
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: "REJECTED",
        kycReviewedAt: new Date(),
        kycRejectionReason: reason.trim(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "KYC rejected successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        kycStatus: user.kycStatus,
        rejectionReason: user.kycRejectionReason,
      },
    });
  } catch (error) {
    console.error("Error rejecting KYC:", error);
    return NextResponse.json(
      { error: "Failed to reject KYC" },
      { status: 500 }
    );
  }
}
