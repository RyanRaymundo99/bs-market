import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { DocumentValidator } from "@/lib/utils/document-validation";
import {
  getAdminAlertSettings,
  sendAdminAlertToAll,
} from "@/lib/admin-alert-email";

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, cpf, password } = await request.json();

    // Validate required fields
    if (!name || !email || !phone || !cpf || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate and clean document (CPF or CNPJ)
    const documentValidation = DocumentValidator.validate(cpf);
    if (!documentValidation.isValid) {
      return NextResponse.json(
        { error: documentValidation.errors[0] || "Invalid CPF or CNPJ" },
        { status: 400 }
      );
    }

    const cleanDocument = documentValidation.cleanDocument;
    const documentType = documentValidation.type;

    // Check if user already exists (by email, document, or phone)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { cpf: cleanDocument },
          { phone },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: `User with this email, ${documentType || "document"}, or phone number already exists`,
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user directly in database (simplified approach)
    try {
      const user = await prisma.user.create({
        data: {
          id: `user_${Date.now()}`,
          name,
          email: email.toLowerCase(),
          phone,
          cpf: cleanDocument, // Store cleaned document (CPF or CNPJ)
          password: hashedPassword,
          emailVerified: true,
          phoneVerified: true, // Phone is verified through the verification process
          approvalStatus: "PENDING", // Require admin approval
          kycStatus: "PENDING", // Require KYC submission
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create initial balance (0 balance for new users)
      await prisma.balance.create({
        data: {
          userId: user.id,
          currency: "BRL",
          amount: 0,
          locked: 0,
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

      // Create a session for the user
      const sessionId = `session-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await prisma.session.create({
        data: {
          id: sessionId,
          token: sessionId,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Set the session cookie
      const response = NextResponse.json({
        success: true,
        message: "Account created successfully! Welcome to BS Market!",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          approvalStatus: user.approvalStatus,
        },
        sessionId: sessionId,
      });

      // Set the session cookie
      response.cookies.set("better-auth.session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
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
