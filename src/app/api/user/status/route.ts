import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";
import { isApprovedCelebrationDismissedInKycData, mergeApprovedCelebrationDismissed } from "@/lib/account-approved-banner-dismiss";

export async function GET(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authSession.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        approvalStatus: true,
        kycStatus: true,
        emailVerified: true,
        phoneVerified: true,
        kycSubmittedAt: true,
        kycReviewedAt: true,
        kycRejectionReason: true,
        kycData: true,
        dailyDepositLimit: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user status information
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        cpf: user.cpf,
        approvalStatus: user.approvalStatus,
        kycStatus: user.kycStatus,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        kycSubmittedAt: user.kycSubmittedAt,
        kycReviewedAt: user.kycReviewedAt,
        kycRejectionReason: user.kycRejectionReason,
        kycData: user.kycData,
        dailyDepositLimit: Number(user.dailyDepositLimit) || 5000,
        approvedCelebrationBannerDismissed:
          isApprovedCelebrationDismissedInKycData(user.kycData),
      },
    });
  } catch (error) {
    console.error("User status API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authSession.userId },
      select: { kycData: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: authSession.userId },
      data: {
        kycData: mergeApprovedCelebrationDismissed(user.kycData),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dismiss approved banner API error:", error);
    return NextResponse.json(
      { error: "Failed to dismiss banner" },
      { status: 500 }
    );
  }
}
