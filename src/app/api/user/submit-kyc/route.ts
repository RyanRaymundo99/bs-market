import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("better-auth.session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const user = session.user;

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
