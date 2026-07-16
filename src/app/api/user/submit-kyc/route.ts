import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";

export async function POST(request: NextRequest) {
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
        cpf: true,
        documentFront: true,
        documentBack: true,
        documentSelfie: true,
        documentNumber: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has all required information
    if (!user.name || !user.email || !user.cpf) {
      return NextResponse.json(
        {
          error:
            "Please fill in all required information (name, email, CPF) before submitting",
        },
        { status: 400 }
      );
    }

    if (!user.documentFront || !user.documentBack || !user.documentSelfie) {
      return NextResponse.json(
        {
          error:
            "Please upload front, back, and selfie documents before submitting for review",
          code: "KYC_DOCUMENTS_MISSING",
        },
        { status: 400 }
      );
    }

    // Mark KYC as submitted for review. Do not demote account approval —
    // signup already auto-approves; only KYC remains pending admin review.
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: "PENDING",
        kycSubmittedAt: new Date(),
        ...(user.documentNumber ? {} : { documentNumber: user.cpf }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        approvalStatus: true,
        kycStatus: true,
        kycSubmittedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "KYC submitted for review",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error submitting KYC:", error);
    return NextResponse.json(
      { error: "Failed to submit KYC" },
      { status: 500 }
    );
  }
}
