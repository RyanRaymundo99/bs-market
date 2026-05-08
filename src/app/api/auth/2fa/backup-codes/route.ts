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

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "2FA token is required" },
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

    // Verify the 2FA token
    const isValid = TwoFactorService.verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid 2FA token" }, { status: 400 });
    }

    // Generate new backup codes
    const newBackupCodes = TwoFactorService.regenerateBackupCodes();

    // Update user with new backup codes
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorBackupCodes: newBackupCodes,
      },
    });

    return NextResponse.json({
      success: true,
      backupCodes: newBackupCodes,
      message: "New backup codes generated successfully",
    });
  } catch (error) {
    console.error("Backup codes generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate new backup codes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA is not enabled for this account" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      backupCodes: user.twoFactorBackupCodes,
      remainingCodes: user.twoFactorBackupCodes.length,
    });
  } catch (error) {
    console.error("Get backup codes error:", error);
    return NextResponse.json(
      {
        error: "Failed to get backup codes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

