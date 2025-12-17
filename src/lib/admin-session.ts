import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export interface AdminSession {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  sessionId: string;
}

/**
 * Validates admin session from cookies
 * Checks both better-auth.admin-session and better-auth.session cookies
 * Verifies that the user is admin_001
 */
export async function validateAdminSession(
  request: NextRequest
): Promise<AdminSession | null> {
  try {
    // Get the admin session cookie (admin uses separate cookie)
    const adminSessionCookie = request.cookies.get("better-auth.admin-session");
    const regularSessionCookie = request.cookies.get("better-auth.session");

    const sessionToken =
      adminSessionCookie?.value || regularSessionCookie?.value;

    if (!sessionToken) {
      return null;
    }

    // Find the session in the database
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      // Delete expired session
      await prisma.session.delete({
        where: { id: session.id },
      });
      return null;
    }

    // Check if user exists and is admin
    if (!session.user || session.user.id !== "admin_001") {
      return null;
    }

    return {
      userId: session.user.id,
      user: session.user,
      sessionId: session.id,
    };
  } catch (error) {
    console.error("Admin session validation error:", error);
    return null;
  }
}
