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

    // Update user KYC status to approved
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: "APPROVED",
        kycReviewedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "KYC approved successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        kycStatus: user.kycStatus,
      },
    });
  } catch (error) {
    console.error("Error approving KYC:", error);
    return NextResponse.json(
      { error: "Failed to approve KYC" },
      { status: 500 }
    );
  }
}
