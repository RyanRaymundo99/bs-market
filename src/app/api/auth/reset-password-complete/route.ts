import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { SMSService } from "@/lib/sms";

export async function POST(request: NextRequest) {
  try {
    const { identifier, code, newPassword, type } = await request.json();

    if (!identifier || !code || !newPassword || !type) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (!["email", "phone"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'email' or 'phone'" },
        { status: 400 }
      );
    }

    // Format identifier based on type
    const formattedIdentifier =
      type === "phone"
        ? SMSService.formatPhoneNumber(identifier)
        : identifier.toLowerCase();

    // Find user by identifier
    const user = await prisma.user.findFirst({
      where:
        type === "email"
          ? { email: formattedIdentifier }
          : { phone: formattedIdentifier },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify that we still have a valid reset verification
    // This ensures the code was recently verified and prevents replay attacks
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: formattedIdentifier,
        type: type === "email" ? "EMAIL" : "PHONE",
        purpose: "password_reset",
        value: code,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!verification) {
      // Check if verification exists but expired
      const expiredVerification = await prisma.verification.findFirst({
        where: {
          identifier: formattedIdentifier,
          type: type === "email" ? "EMAIL" : "PHONE",
          purpose: "password_reset",
          value: code,
        },
      });

      if (expiredVerification) {
        console.error("Password reset code expired:", {
          identifier: formattedIdentifier,
          expiresAt: expiredVerification.expiresAt,
          now: new Date(),
        });
        return NextResponse.json(
          { error: "Reset code has expired. Please request a new reset code." },
          { status: 400 }
        );
      }

      console.error("Password reset verification not found:", {
        identifier: formattedIdentifier,
        type: type === "email" ? "EMAIL" : "PHONE",
        code: code,
      });
      return NextResponse.json(
        { error: "Invalid or expired reset code. Please request a new reset." },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 12);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // Delete the verification record to prevent reuse
    await prisma.verification.delete({
      where: { id: verification.id },
    });

    // Delete any active sessions to force re-login
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message:
        "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Password reset completion error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
