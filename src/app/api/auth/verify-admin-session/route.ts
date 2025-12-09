import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Check for admin session cookie (separate from regular user sessions)
    const sessionToken = request.cookies.get(
      "better-auth.admin-session"
    )?.value;

    if (!sessionToken) {
      return NextResponse.json({
        valid: false,
        error: "No admin session token",
      });
    }

    // Verify session and check if user is admin
    const session = await prisma.session.findFirst({
      where: {
        token: sessionToken,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session?.user || session.user.id !== "admin_001") {
      return NextResponse.json({
        valid: false,
        error: "Invalid session or not admin",
      });
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json({
      valid: false,
      error: "Session verification failed",
    });
  }
}
