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
      select: { id: true, name: true, email: true, cpf: true },
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

    // Update user status to indicate KYC has been submitted
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: "PENDING",
        approvalStatus: "PENDING",
        kycSubmittedAt: new Date(),
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
