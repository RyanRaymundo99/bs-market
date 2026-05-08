import { NextRequest, NextResponse } from "next/server";
import type { ApiErrorBody } from "@/lib/api-response";
import { jsonError } from "@/lib/api-response";
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

export type RequireAdminSessionResult =
  | { ok: true; session: AdminSession }
  | { ok: false; response: NextResponse<ApiErrorBody> };

/**
 * Resolve an admin session or a consistent 401 JSON response.
 */
export async function requireAdminSession(
  request: NextRequest
): Promise<RequireAdminSessionResult> {
  const session = await validateAdminSession(request);
  if (!session) {
    return {
      ok: false,
      response: jsonError(401, "Unauthorized", "UNAUTHORIZED"),
    };
  }
  return { ok: true, session };
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
