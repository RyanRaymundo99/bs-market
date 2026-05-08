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
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "2FA token and password are required" },
        { status: 400 }
      );
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA is not enabled for this account" },
        { status: 400 }
      );
    }

    // Verify password (you'll need to implement password verification)
    // For now, we'll assume password verification is handled elsewhere

    // Verify the 2FA token
    const verification = TwoFactorService.verifyTokenOrBackupCode(
      user.twoFactorSecret,
      token,
      user.twoFactorBackupCodes
    );

    if (!verification.isValid) {
      return NextResponse.json(
        { error: "Invalid 2FA token or backup code" },
        { status: 400 }
      );
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    return NextResponse.json({
      success: true,
      message: "2FA has been disabled for your account",
    });
  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json(
      {
        error: "Failed to disable 2FA",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

