import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export interface VerificationResult {
  success: boolean;
  message: string;
  code?: string;
}

export interface VerificationCheck {
  success: boolean;
  message: string;
  attemptsRemaining?: number;
}

export class VerificationService {
  /**
   * Generate a 4-digit verification code
   */
  static generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Send email verification code
   */
  static async sendEmailVerification(
    email: string,
    purpose: string = "signup"
  ): Promise<VerificationResult> {
    try {
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete any existing verification for this email and purpose
      await prisma.verification.deleteMany({
        where: {
          identifier: email.toLowerCase(),
          type: "EMAIL",
          purpose,
        },
      });

      // Create new verification
      await prisma.verification.create({
        data: {
          id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          identifier: email.toLowerCase(),
          value: code,
          type: "EMAIL",
          purpose,
          expiresAt,
        },
      });

      // Send email
      const subject =
        purpose === "signup"
          ? "Verify your BS Market email address"
          : "BS Market email verification";

      const text = `Your BS Market verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this verification, please ignore this email.

Best regards,
The BS Market Team`;

      const emailResult = await sendEmail({
        to: email,
        subject,
        text,
      });

      if (emailResult.success) {
        return {
          success: true,
          message: "Verification code sent to your email",
          code: process.env.NODE_ENV === "development" ? code : undefined,
        };
      } else {
        return {
          success: false,
          message: "Failed to send verification email",
        };
      }
    } catch (error) {
      console.error("Email verification error:", error);
      return {
        success: false,
        message: "Failed to send verification email",
      };
    }
  }

  /**
   * Send password reset code (email only)
   */
  static async sendPasswordResetCode(
    identifier: string
  ): Promise<VerificationResult> {
    try {
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const formattedIdentifier = identifier.toLowerCase();

      // Delete any existing password reset verification
      await prisma.verification.deleteMany({
        where: {
          identifier: formattedIdentifier,
          type: "EMAIL",
          purpose: "password_reset",
        },
      });

      // Create new verification
      await prisma.verification.create({
        data: {
          id: `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          identifier: formattedIdentifier,
          value: code,
          type: "EMAIL",
          purpose: "password_reset",
          expiresAt,
        },
      });

      // Send email
      const emailResult = await sendEmail({
        to: formattedIdentifier,
        subject: "BS Market - Código de Redefinição de Senha",
        text: `Olá!

Você solicitou a redefinição de senha para sua conta no BS Market.

Seu código de redefinição é: ${code}

Este código expira em 10 minutos.

Se você não solicitou esta redefinição, ignore este email.

Atenciosamente,
Equipe BS Market
bsmarket.com.br`,
      });

      if (emailResult.success) {
        return {
          success: true,
          message: `Password reset code sent to your email`,
          code: process.env.NODE_ENV === "development" ? code : undefined,
        };
      } else {
        return {
          success: false,
          message: `Failed to send password reset code via email`,
        };
      }
    } catch (error) {
      console.error("Password reset error:", error);
      return {
        success: false,
        message: "Failed to send password reset code",
      };
    }
  }

  /**
   * Verify a code (email only)
   */
  static async verifyCode(
    identifier: string,
    code: string,
    type: "EMAIL",
    purpose: string = "signup"
  ): Promise<VerificationCheck> {
    try {
      const formattedIdentifier = identifier.toLowerCase();

      // Find verification record
      const verification = await prisma.verification.findFirst({
        where: {
          identifier: formattedIdentifier,
          type,
          purpose,
          expiresAt: {
            gte: new Date(),
          },
        },
      });

      if (!verification) {
        return {
          success: false,
          message: "Verification code not found or expired",
        };
      }

      // Check attempts BEFORE incrementing
      if (verification.attempts >= verification.maxAttempts) {
        return {
          success: false,
          message: "Maximum verification attempts exceeded",
          attemptsRemaining: 0,
        };
      }

      // Check if code matches BEFORE incrementing attempts
      if (verification.value !== code) {
        // Increment attempts only if code is wrong
        await prisma.verification.update({
          where: { id: verification.id },
          data: { attempts: verification.attempts + 1 },
        });

        const attemptsRemaining =
          verification.maxAttempts - (verification.attempts + 1);
        return {
          success: false,
          message: "Invalid verification code",
          attemptsRemaining: Math.max(0, attemptsRemaining),
        };
      }

      // Code is valid - only delete the verification record if it's NOT a password reset
      // For password reset, we need to keep the record until the password is actually reset
      // Don't increment attempts for successful verification
      if (purpose !== "password_reset") {
        await prisma.verification.delete({
          where: { id: verification.id },
        });
      }

      return {
        success: true,
        message: "Verification successful",
      };
    } catch (error) {
      console.error("Verification check error:", error);
      return {
        success: false,
        message: "Verification failed",
      };
    }
  }

  /**
   * Clean up expired verification codes
   */
  static async cleanupExpiredCodes(): Promise<void> {
    try {
      const result = await prisma.verification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      console.log(`Cleaned up ${result.count} expired verification codes`);
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
}

export default VerificationService;
