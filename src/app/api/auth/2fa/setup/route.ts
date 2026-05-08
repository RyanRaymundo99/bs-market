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
        email: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA is already enabled for this account" },
        { status: 400 }
      );
    }

    // Generate 2FA setup data
    const setup = await TwoFactorService.generateSecret(
      user.email,
      "BS Market"
    );

    // Store the secret temporarily (not enabled yet)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: setup.secret,
        twoFactorBackupCodes: setup.backupCodes,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: setup.qrCodeUrl,
        backupCodes: setup.backupCodes,
        secret: setup.secret, // For manual entry in authenticator apps
      },
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      {
        error: "Failed to set up 2FA",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

