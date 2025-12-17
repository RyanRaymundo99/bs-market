import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // First check if user exists with this email
    const userByEmail = await prisma.user.findFirst({
      where: {
        email: emailLower,
      },
    });

    if (!userByEmail) {
      console.error("Admin login attempt - User not found:", emailLower);
      return NextResponse.json(
        {
          error: "Invalid admin credentials",
          hint: "Admin user may not exist. Check /api/auth/check-admin or /api/auth/diagnose-admin",
        },
        { status: 401 }
      );
    }

    // Check if user is the admin user
    if (userByEmail.id !== "admin_001") {
      console.error("Admin login attempt - User is not admin:", {
        email: emailLower,
        userId: userByEmail.id,
      });
      return NextResponse.json(
        {
          error: "Invalid admin credentials",
          hint: `User exists but ID is '${userByEmail.id}' instead of 'admin_001'. Check /api/auth/diagnose-admin for details.`,
        },
        { status: 401 }
      );
    }

    const adminUser = userByEmail;

    // Verify password
    if (!adminUser.password) {
      console.error("Admin login attempt - No password set for admin user");
      return NextResponse.json(
        {
          error:
            "Admin account has no password set. Please reset the password.",
        },
        { status: 401 }
      );
    }

    const isPasswordValid = await compare(password, adminUser.password);
    if (!isPasswordValid) {
      console.error("Admin login attempt - Wrong password for:", emailLower);
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    console.log("Admin login successful for:", emailLower);

    // Create admin session
    const sessionId = `admin-session-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    await prisma.session.create({
      data: {
        id: sessionId,
        token: sessionId,
        userId: adminUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Set admin session cookie
    const response = NextResponse.json({
      success: true,
      message: "Admin login successful",
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: "admin",
      },
    });

    console.log("Setting admin session cookie:", sessionId);
    // Use separate cookie for admin so it doesn't conflict with regular user sessions
    response.cookies.set("better-auth.admin-session", sessionId, {
      httpOnly: false, // Changed to false for debugging
      secure: false, // Changed to false for local development
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    console.log("Admin login successful, session created");
    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
