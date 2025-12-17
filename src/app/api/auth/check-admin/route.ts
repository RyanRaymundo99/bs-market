import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Check if admin user exists
    const adminUser = await prisma.user.findUnique({
      where: { id: "admin_001" },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        approvalStatus: true,
        createdAt: true,
      },
    });

    if (!adminUser) {
      return NextResponse.json({
        exists: false,
        message: "Admin user does not exist. You need to create it first.",
        instructions:
          "If you're on localhost, visit /api/auth/create-admin to create the admin user.",
      });
    }

    return NextResponse.json({
      exists: true,
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        hasPassword: !!adminUser.password,
        approvalStatus: adminUser.approvalStatus,
        createdAt: adminUser.createdAt,
      },
      message: adminUser.password
        ? "Admin user exists and has a password set."
        : "Admin user exists but has no password set. Password reset required.",
    });
  } catch (error) {
    console.error("Admin check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check admin status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
