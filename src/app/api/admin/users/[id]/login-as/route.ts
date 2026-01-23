import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the user to login as
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        approvalStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is approved (optional - you might want to allow logging in as unapproved users)
    // if (user.approvalStatus !== "APPROVED") {
    //   return NextResponse.json(
    //     { error: "User is not approved" },
    //     { status: 400 }
    //   );
    // }

    // Get IP address and user agent for security tracking
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded
      ? forwarded.split(",")[0]
      : request.headers.get("x-real-ip") || null;
    const userAgent = request.headers.get("user-agent") || null;

    // Create a session for the user
    const sessionId = `user-session-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Delete any existing sessions for this user (optional - you might want to keep multiple sessions)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Create new session with IP and user agent
    await prisma.session.create({
      data: {
        id: sessionId,
        token: sessionId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ipAddress: ipAddress,
        userAgent: userAgent,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      message: `Logged in as ${user.name}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      redirectUrl: "/dashboard",
      sessionId: sessionId,
    });

    // Set the session cookie (same as regular login)
    response.cookies.set("better-auth.session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    // Also set auth-session in localStorage (for client-side checks)
    // This will be handled by the frontend

    return response;
  } catch (error) {
    console.error("Error logging in as user:", error);
    return NextResponse.json(
      {
        error: "Failed to login as user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
