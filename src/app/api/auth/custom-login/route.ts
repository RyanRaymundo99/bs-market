import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

export async function POST(request: NextRequest) {
  console.log("Custom login endpoint called");
  try {
    const { email, password } = await request.json();
    console.log("Login attempt for email:", email);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // First, try to find a user with the custom password field (dev users)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    let isValidPassword = false;

    // Check if this is a dev user with custom password
    if (user.password) {
      // This is a dev user with bcrypt password
      try {
        isValidPassword = await compare(password, user.password);
        console.log("Dev user password check:", { isValid: isValidPassword });
      } catch (error) {
        console.error("Error comparing bcrypt password:", error);
        isValidPassword = false;
      }
    } else {
      // This is a better-auth user, check Account table
      const account = user.accounts.find((acc) => acc.password);
      if (account?.password) {
        try {
          isValidPassword = await compare(password, account.password);
          console.log("Better-auth password check:", {
            isValid: isValidPassword,
          });
        } catch (error) {
          console.error("Error comparing better-auth password:", error);
          isValidPassword = false;
        }
      }
    }

    if (!isValidPassword) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    // Check if user is approved
    if (user.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Account not approved" },
        { status: 403 }
      );
    }

    // Create a proper better-auth session
    try {
      // Generate a unique session ID
      const sessionId = `dev-session-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create session in the database
      await prisma.session.create({
        data: {
          id: sessionId,
          token: sessionId, // The schema expects a token field
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Set the session cookie
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          approvalStatus: user.approvalStatus,
          kycStatus: user.kycStatus,
        },
        message: "Login successful",
        sessionId: sessionId,
      });

      // Set the session cookie with the same name better-auth expects
      response.cookies.set("better-auth.session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: "/",
      });

      console.log(
        "Login successful for user:",
        user.id,
        "Session ID:",
        sessionId
      );
      return response;
    } catch (sessionError) {
      console.error("Error creating session:", sessionError);

      // Fallback to simple response if session creation fails
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          approvalStatus: user.approvalStatus,
          kycStatus: user.kycStatus,
        },
        message: "Login successful (session creation failed)",
        warning: "Session may not persist properly",
      });
    }
  } catch (error) {
    console.error("Custom login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
