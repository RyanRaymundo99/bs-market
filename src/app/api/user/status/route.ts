import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("better-auth.session");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "No session cookie found" },
        { status: 401 }
      );
    }

    // Find the session in the database
    const session = await prisma.session.findUnique({
      where: { token: sessionCookie.value },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // Return user status information
    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        phone: session.user.phone,
        cpf: session.user.cpf,
        approvalStatus: session.user.approvalStatus,
        kycStatus: session.user.kycStatus,
        emailVerified: session.user.emailVerified,
        phoneVerified: session.user.phoneVerified,
        kycSubmittedAt: session.user.kycSubmittedAt,
        kycReviewedAt: session.user.kycReviewedAt,
        kycRejectionReason: session.user.kycRejectionReason,
        kycData: session.user.kycData,
        dailyDepositLimit: Number(session.user.dailyDepositLimit) || 5000,
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
