import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get("better-auth.session")?.value;
    if (!cookie) {
      return NextResponse.json({
        authenticated: false,
        message: "No session cookie found",
      });
    }

    const auth = await validateSession(request);
    if (!auth) {
      return NextResponse.json({
        authenticated: false,
        message: "Invalid session",
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
      },
      sessionId: auth.sessionId,
      expiresAt: auth.expiresAt,
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json(
      {
        authenticated: false,
        error: "Failed to validate session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
