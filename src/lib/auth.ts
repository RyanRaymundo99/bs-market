import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { sendEmail } from "@/lib/email";
import { nextCookies } from "better-auth/next-js";

// Lazy initialization - only create auth when accessed
let authInstance: ReturnType<typeof betterAuth> | null = null;

export const getAuth = (): ReturnType<typeof betterAuth> => {
  if (!authInstance) {
    // Only import and instantiate Prisma when this function is called
    // Using dynamic import with synchronous require for compatibility
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: prisma } = require("@/lib/prisma");

    authInstance = betterAuth({
      database: prismaAdapter(prisma, {
        provider: "mongodb",
      }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
          await sendEmail({
            to: user.email,
            subject: "Reset your password",
            text: `Click the link to reset your password: ${url}`,
          });
        },
      },
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          redirectURL: `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`,
        },
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24 * 7,
        cookieCache: {
          enabled: false, // Disable cookie caching to prevent session data size issues
        },
        cookieName: "better-auth.session",
        cookieSecure: process.env.NODE_ENV === "production",
        cookieSameSite: "lax",
      },
      emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, token }) => {
          console.log("🔍 Verification email requested for:", user.email);
          console.log("🔍 Token:", token);
          console.log("🔍 BETTER_AUTH_URL:", process.env.BETTER_AUTH_URL);
          console.log(
            "🔍 EMAIL_VERIFICATION_CALLBACK_URL:",
            process.env.EMAIL_VERIFICATION_CALLBACK_URL
          );

          const verificationUrl = `${process.env.BETTER_AUTH_URL}/api/auth/verify-email?token=${token}&callbackURL=${process.env.EMAIL_VERIFICATION_CALLBACK_URL}`;
          console.log("🔍 Verification URL:", verificationUrl);

          try {
            const result = await sendEmail({
              to: user.email,
              subject: "Verify your email address",
              text: `Click the link to verify your email address: ${verificationUrl}`,
            });
            console.log("🔍 Email send result:", result);
          } catch (error) {
            console.error("❌ Error in sendVerificationEmail:", error);
          }
        },
      },
      plugins: [nextCookies()],
    });
  }
  return authInstance;
};

// Export for backward compatibility
export const auth = getAuth();
