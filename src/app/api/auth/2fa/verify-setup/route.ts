import { NextRequest, NextResponse } from "next/server";
import { TwoFactorService } from "@/lib/two-factor";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json(
        { error: "No session cookie found" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authSession.userId },
      select: {
        id: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "2FA token is required" },
        { status: 400 }
      );
    }

    // Validate token format
    if (!TwoFactorService.isValidTokenFormat(token)) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Check if user has a temporary secret
    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA setup not initiated. Please start setup first." },
        { status: 400 }
      );
    }

    // Verify the token
    const isValid = TwoFactorService.verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid 2FA token" }, { status: 400 });
    }

    // Enable 2FA for the user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "2FA has been successfully enabled for your account",
    });
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json(
      {
        error: "Failed to verify 2FA setup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

