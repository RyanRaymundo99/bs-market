import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("better-auth.session");

    if (sessionCookie?.value) {
      // Find and delete the session from the database
      try {
        await prisma.session.deleteMany({
          where: {
            token: sessionCookie.value,
          },
        });
      } catch (error) {
        console.error("Error deleting session:", error);
        // Continue even if session deletion fails
      }
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear the session cookie - use both methods to ensure it's cleared
    response.cookies.delete("better-auth.session");
    // Also set it to empty with immediate expiration as backup
    response.cookies.set("better-auth.session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Even if there's an error, clear the cookie
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear the session cookie - use both methods to ensure it's cleared
    response.cookies.delete("better-auth.session");
    // Also set it to empty with immediate expiration as backup
    response.cookies.set("better-auth.session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });

    return response;
  }
}

