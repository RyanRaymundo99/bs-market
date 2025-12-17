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

    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        id: "admin_001", // Ensure it's the admin user
      },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    // Verify password
    if (!adminUser.password) {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await compare(password, adminUser.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

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
