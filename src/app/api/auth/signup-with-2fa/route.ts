import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import {
  getAdminAlertSettings,
  sendAdminAlertToAll,
} from "@/lib/admin-alert-email";

export async function POST(request: NextRequest) {
  try {
    const { name, email, cpf, password } = await request.json();

    // Validate required fields
    if (!name || !email || !cpf || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { cpf }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or CPF already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user with 2FA requirement flag
    try {
      const user = await prisma.user.create({
        data: {
          id: `user_${Date.now()}`,
          name,
          email,
          cpf,
          password: hashedPassword,
          emailVerified: true,
          approvalStatus: "PENDING", // Keep pending until 2FA is setup
          kycStatus: "PENDING",
          twoFactorEnabled: false, // Will be enabled during setup
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Notify admin email when new account is created (ready for approval) - non-blocking
      getAdminAlertSettings()
        .then((settings) => {
          if (settings.notifyNewAccount && settings.emails?.length) {
            return sendAdminAlertToAll(
              settings,
              "New account created – ready for approval",
              `${user.name} (${user.email}) has registered and is pending approval. User ID: ${user.id}.`
            );
          }
        })
        .catch((err) => console.error("Admin new-account alert:", err));

      // Create initial balance (0 balance for new users)
      await prisma.balance.create({
        data: {
          userId: user.id,
          currency: "BRL",
          amount: 0,
          locked: 0,
        },
      });

      // Create a temporary session for 2FA setup
      const sessionId = `temp-session-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await prisma.session.create({
        data: {
          id: sessionId,
          token: sessionId,
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes for 2FA setup
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Set the temporary session cookie
      const response = NextResponse.json({
        success: true,
        message: "Account created! Please complete 2FA setup to activate your account.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          approvalStatus: user.approvalStatus,
          twoFactorRequired: true,
        },
        sessionId: sessionId,
        requires2FA: true,
      });

      // Set the temporary session cookie
      response.cookies.set("better-auth.session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60, // 30 minutes in seconds
        path: "/",
      });

      return response;
    } catch (error) {
      console.error("Signup error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

