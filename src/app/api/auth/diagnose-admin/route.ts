import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

export async function GET() {
  try {
    const email = "admin@bsmarket.com.br";
    const testPassword = "admin123";
    const emailLower = email.toLowerCase();

    // Check 1: Does user exist with this email?
    const userByEmail = await prisma.user.findFirst({
      where: { email: emailLower },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        approvalStatus: true,
      },
    });

    // Check 2: Does admin_001 exist?
    const adminById = await prisma.user.findUnique({
      where: { id: "admin_001" },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        approvalStatus: true,
      },
    });

    const diagnostics = {
      emailCheck: {
        exists: !!userByEmail,
        user: userByEmail
          ? {
              id: userByEmail.id,
              email: userByEmail.email,
              name: userByEmail.name,
              hasPassword: !!userByEmail.password,
              isAdminId: userByEmail.id === "admin_001",
            }
          : null,
      },
      adminIdCheck: {
        exists: !!adminById,
        user: adminById
          ? {
              id: adminById.id,
              email: adminById.email,
              name: adminById.name,
              hasPassword: !!adminById.password,
            }
          : null,
      },
      issues: [] as string[],
      solutions: [] as string[],
    };

    // Diagnose issues
    if (!userByEmail && !adminById) {
      diagnostics.issues.push("Admin user does not exist");
      diagnostics.solutions.push(
        "Create admin user: Set ALLOW_ADMIN_CREATION=true and POST to /api/auth/create-admin"
      );
    } else if (userByEmail && userByEmail.id !== "admin_001") {
      diagnostics.issues.push(
        `User with email ${emailLower} exists but has wrong ID: ${userByEmail.id} (expected: admin_001)`
      );
      diagnostics.solutions.push(
        "Update user ID to 'admin_001' in database, or create new admin user"
      );
    } else if (adminById && adminById.email !== emailLower) {
      diagnostics.issues.push(
        `Admin user exists but has wrong email: ${adminById.email} (expected: ${emailLower})`
      );
      diagnostics.solutions.push(
        `Update admin email to ${emailLower} in database`
      );
    } else if (adminById && !adminById.password) {
      diagnostics.issues.push("Admin user exists but has no password");
      diagnostics.solutions.push(
        "Set ALLOW_ADMIN_PASSWORD_RESET=true and POST to /api/auth/reset-admin-password with new password"
      );
    } else if (adminById && adminById.password) {
      // Test password
      try {
        const passwordMatches = await compare(testPassword, adminById.password);
        if (!passwordMatches) {
          diagnostics.issues.push("Password does not match 'admin123'");
          diagnostics.solutions.push(
            "Reset password: Set ALLOW_ADMIN_PASSWORD_RESET=true and POST to /api/auth/reset-admin-password"
          );
        } else {
          diagnostics.issues.push(
            "✅ All checks passed! Admin should be able to login."
          );
        }
      } catch {
        diagnostics.issues.push("Error testing password");
        diagnostics.solutions.push("Check password hash format in database");
      }
    }

    return NextResponse.json({
      diagnostics,
      summary:
        diagnostics.issues.length === 0
          ? "Admin user is properly configured"
          : `Found ${diagnostics.issues.length} issue(s)`,
    });
  } catch (error) {
    console.error("Admin diagnosis error:", error);
    return NextResponse.json(
      {
        error: "Failed to diagnose admin setup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
