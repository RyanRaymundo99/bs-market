import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    // Security: Only allow on localhost or with special env var
    const host = request.headers.get("host") || "";
    const allowReset = process.env.ALLOW_ADMIN_PASSWORD_RESET === "true";
    const isLocalhost =
      host.includes("localhost") || host.includes("127.0.0.1");

    if (!isLocalhost && !allowReset) {
      return NextResponse.json(
        {
          error: "This endpoint is only available on localhost",
          hint: "Set ALLOW_ADMIN_PASSWORD_RESET=true in environment variables to enable on production (use with extreme caution!)",
        },
        { status: 403 }
      );
    }

    const { password } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password is required and must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if admin user exists
    const adminUser = await prisma.user.findUnique({
      where: { id: "admin_001" },
    });

    if (!adminUser) {
      return NextResponse.json(
        {
          error:
            "Admin user does not exist. Create it first using /api/auth/create-admin",
        },
        { status: 404 }
      );
    }

    // Hash and update password
    const hashedPassword = await hash(password, 12);

    await prisma.user.update({
      where: { id: "admin_001" },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log("Admin password reset successfully");

    return NextResponse.json({
      success: true,
      message: "Admin password has been reset successfully",
      email: adminUser.email,
      instructions: "You can now login with the new password at /admin/login",
    });
  } catch (error) {
    console.error("Admin password reset error:", error);
    return NextResponse.json(
      {
        error: "Failed to reset admin password",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
