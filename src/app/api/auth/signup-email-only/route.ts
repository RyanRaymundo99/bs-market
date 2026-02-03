import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { DocumentValidator } from "@/lib/utils/document-validation";
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

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { cpf: cleanDocument }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: `User with this email or ${documentType || "document"} already exists`,
        },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user with email verification only
    const user = await prisma.user.create({
      data: {
        id: `user_${Date.now()}`,
        name,
        email: email.toLowerCase(),
        cpf: cleanDocument, // Store cleaned document (CPF or CNPJ)
        password: hashedPassword,
        emailVerified: false, // Will be verified via email
        phoneVerified: true, // Skip phone verification
        phone: null, // No phone required
        approvalStatus: "PENDING",
        kycStatus: "PENDING",
        twoFactorEnabled: false,
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

    // Create initial balance
    await prisma.balance.create({
      data: {
        userId: user.id,
        currency: "BRL",
        amount: 0,
        locked: 0,
      },
    });

    // Create temporary session for email verification
    const sessionId = `temp-session-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    await prisma.session.create({
      data: {
        id: sessionId,
        token: sessionId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      message: "Account created successfully. Please verify your email.",
      userId: user.id,
    });

    response.cookies.set("better-auth.session_token", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
    });

    return response;
  } catch (error) {
    console.error("Email-only signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
