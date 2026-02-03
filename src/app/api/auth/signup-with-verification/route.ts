import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { SMSService } from "@/lib/sms";
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

    // Validate phone number format
    if (!SMSService.validatePhoneNumber(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    const formattedPhone = SMSService.formatPhoneNumber(phone);

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
        OR: [
          { email: email.toLowerCase() },
          { cpf: cleanDocument },
          { phone: formattedPhone },
        ],
      },
    });

    if (existingUser) {
      let errorMessage = "User already exists with this ";
      if (existingUser.email === email.toLowerCase()) {
        errorMessage += "email address";
      } else if (existingUser.cpf === cleanDocument) {
        errorMessage += documentType || "document";
      } else if (existingUser.phone === formattedPhone) {
        errorMessage += "phone number";
      }

      console.log("Signup conflict detected:", {
        email: email.toLowerCase(),
        document: cleanDocument,
        documentType,
        phone: formattedPhone,
        existingUser: {
          id: existingUser.id,
          email: existingUser.email,
          cpf: existingUser.cpf,
          phone: existingUser.phone,
        },
        conflictField: errorMessage,
      });

      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user with verification requirements
    try {
      console.log("Creating user with document:", {
        original: cpf,
        cleaned: cleanDocument,
        type: documentType,
      });

      const user = await prisma.user.create({
        data: {
          id: `user_${Date.now()}`,
          name,
          email: email.toLowerCase(),
          phone: formattedPhone,
          cpf: cleanDocument, // Store cleaned document (CPF or CNPJ)
          password: hashedPassword,
          emailVerified: false, // Will be verified in next step
          phoneVerified: true, // Phone verification removed - set to true
          approvalStatus: "PENDING", // Keep pending until all verifications are complete
          kycStatus: "PENDING",
          twoFactorEnabled: false, // Will be enabled during setup
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log("User created successfully:", {
        id: user.id,
        document: user.cpf,
        type: documentType,
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

      // Create a temporary session for verification and 2FA setup
      const sessionId = `temp-session-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await prisma.session.create({
        data: {
          id: sessionId,
          token: sessionId,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour for complete setup
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Set the temporary session cookie
      const response = NextResponse.json({
        success: true,
        message: "Account created! Please verify your email and phone number.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          approvalStatus: user.approvalStatus,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        },
        sessionId: sessionId,
        requiresVerification: true,
        requires2FA: true,
      });

      // Set the temporary session cookie
      response.cookies.set("better-auth.session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour in seconds
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
