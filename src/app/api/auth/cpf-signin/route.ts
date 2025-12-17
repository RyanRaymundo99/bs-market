import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { cpf, password } = await request.json();

    if (!cpf || !password) {
      return NextResponse.json(
        { error: "CPF and password are required" },
        { status: 400 }
      );
    }

    console.log("CPF login attempt:", { cpf });

    // Find user by CPF or email
    const cleanCPF = cpf.replace(/\D/g, "");
    const formattedCPF = cpf;
    const isEmail = cpf.includes("@");

    console.log("Searching for user:", {
      cpf,
      cleanCPF,
      formattedCPF,
      isEmail,
    });

    // Debug: Check what users exist in the database
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        approvalStatus: true,
      },
    });
    console.log("All users in database:", allUsers);

    // Check if any users have password accounts
    const usersWithPasswordAccounts = await prisma.account.findMany({
      where: {
        password: { not: null },
      },
      select: {
        userId: true,
        password: true,
      },
    });
    console.log(
      "Users with password accounts:",
      usersWithPasswordAccounts.length
    );

    // Search for user by CPF or email
    let user;

    if (isEmail) {
      // Search by email
      user = await prisma.user.findFirst({
        where: {
          email: cpf,
          approvalStatus: "APPROVED",
        },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          approvalStatus: true,
          password: true, // Include password for verification
        },
      });
      console.log("Searching by email:", cpf);
    } else {
      // Search by CPF
      user = await prisma.user.findFirst({
        where: {
          OR: [{ cpf: cpf }, { cpf: cleanCPF }, { cpf: formattedCPF }],
          approvalStatus: "APPROVED",
        },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          approvalStatus: true,
          password: true, // Include password for verification
        },
      });
      console.log("Searching by CPF:", { cpf, cleanCPF, formattedCPF });
    }

    if (!user) {
      const searchType = isEmail ? "email" : "CPF";
      console.log(`User not found for ${searchType}:`, cpf);

      // Check if any users exist at all
      if (allUsers.length === 0) {
        return NextResponse.json(
          {
            error:
              "No users found in database. Please create an account first.",
          },
          { status: 401 }
        );
      }

      // Check if user exists but with different approval status
      let unapprovedUser;
      if (isEmail) {
        unapprovedUser = await prisma.user.findFirst({
          where: { email: cpf },
        });
      } else {
        unapprovedUser = await prisma.user.findFirst({
          where: {
            OR: [{ cpf: cpf }, { cpf: cleanCPF }, { cpf: formattedCPF }],
          },
        });
      }

      if (unapprovedUser) {
        return NextResponse.json(
          {
            error:
              "Account exists but is not yet approved. Please wait for approval or contact support.",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          error: `No account found with this ${searchType}. Please check your ${searchType} or create a new account.`,
        },
        { status: 401 }
      );
    }

    console.log("User found:", {
      id: user.id,
      name: user.name,
      email: user.email,
    });

    // Check if user has password stored directly in User table
    console.log("Checking password stored in User table for:", user.email);

    if (!user.password) {
      console.log("User has no password set, cannot authenticate");
      return NextResponse.json(
        {
          error:
            "User account has no password set. Please use the 'Create Dev Access' button first.",
        },
        { status: 401 }
      );
    }

    console.log("Password found in User table:", {
      hasPassword: !!user.password,
      passwordLength: user.password?.length || 0,
      startsWithDollar: user.password?.startsWith("$2b$") || false,
    });

    try {
      console.log("Verifying encrypted password...");
      console.log("Input password:", password);
      console.log("Input password length:", password.length);
      console.log("Stored hash:", user.password);
      console.log("Stored hash length:", user.password?.length || 0);

      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log("Encrypted password verification result:", isPasswordValid);

      if (!isPasswordValid) {
        console.log("Password verification failed - hash mismatch");
        console.log(
          "This usually means the password was hashed differently or there's a mismatch"
        );
        return NextResponse.json({ error: "Wrong password" }, { status: 401 });
      }

      console.log("✅ Encrypted password verified successfully!");
    } catch (bcryptError) {
      console.error("Bcrypt verification error:", bcryptError);
      return NextResponse.json(
        { error: "Password verification failed" },
        { status: 500 }
      );
    }

    // After verifying the password, use better-auth's sign-in to set cookies properly
    console.log("Password verified, signing in via better-auth...");

    try {
      const auth = getAuth();
      const signInResult = await auth.api.signInEmail({
        body: {
          email: user.email,
          password: password,
        },
      });

      console.log("signInEmail result:", signInResult);

      if (signInResult.user) {
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            cpf: user.cpf,
            approvalStatus: user.approvalStatus,
          },
          message: "CPF login successful via signInEmail",
          sessionId: signInResult.token || "session-created",
          requiresEmailLogin: false,
        });
      }

      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    } catch (e) {
      console.error("signInEmail error:", e);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("CPF login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
