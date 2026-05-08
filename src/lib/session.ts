import { NextRequest, NextResponse } from "next/server";
import type { ApiErrorBody } from "./api-response";
import { jsonError } from "./api-response";
import prisma from "./prisma";

export interface ValidatedSession {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    approvalStatus: string;
    kycStatus: string;
  };
  sessionId: string;
  expiresAt: Date;
}

export type RequireSessionResult =
  | { ok: true; session: ValidatedSession }
  | { ok: false; response: NextResponse<ApiErrorBody> };

/**
 * Resolve the current user session or a consistent 401 JSON response.
 */
export async function requireSession(
  request: NextRequest
): Promise<RequireSessionResult> {
  const session = await validateSession(request);
  if (!session) {
    return {
      ok: false,
      response: jsonError(401, "Unauthorized", "UNAUTHORIZED"),
    };
  }
  return { ok: true, session };
}

export async function validateSession(
  request: NextRequest
): Promise<ValidatedSession | null> {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("better-auth.session");

    if (!sessionCookie?.value) {
      return null;
    }

    // Find the session in the database
    const session = await prisma.session.findUnique({
      where: { token: sessionCookie.value },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            approvalStatus: true,
            kycStatus: true,
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

    // Check if user exists and is approved
    if (!session.user) {
      return null;
    }

    return {
      userId: session.user.id,
      user: session.user,
      sessionId: session.id,
      expiresAt: session.expiresAt,
    };
  } catch (error) {
    console.error("Session validation error:", error);
    return null;
  }
}

export async function refreshSession(sessionId: string): Promise<boolean> {
  try {
    // Extend session by 7 days
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    });
    return true;
  } catch (error) {
    console.error("Session refresh error:", error);
    return false;
  }
}
