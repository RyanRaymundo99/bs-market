import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { sendEmail } from "@/lib/email";
import { nextCookies } from "better-auth/next-js";

// Lazy initialization - only create auth when accessed
let authInstance: any = null;

export const getAuth = () => {
  if (!authInstance) {
    // Only import and instantiate Prisma when this function is called
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
          const verificationUrl = `${process.env.BETTER_AUTH_URL}/api/auth/verify-email?token=${token}&callbackURL=${process.env.EMAIL_VERIFICATION_CALLBACK_URL}`;
          await sendEmail({
            to: user.email,
            subject: "Verify your email address",
            text: `Click the link to verify your email address: ${verificationUrl}`,
          });
        },
      },
      plugins: [nextCookies()],
    });
  }
  return authInstance;
};

// Export for backward compatibility
export const auth = getAuth();
