import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { sendEmail } from "@/lib/email";
import { nextCookies } from "better-auth/next-js";

const createAuth = () => {
  // Only import and instantiate Prisma when this function is called
  // Using dynamic import with synchronous require for compatibility
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: prisma } = require("@/lib/prisma");

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    baseURL:
      process.env.BETTER_AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000",
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        try {
          console.log("🔄 Sending password reset email to:", user.email);
          const result = await sendEmail({
            to: user.email,
            subject: "BS Market - Reset your password",
            text: `Hi there!\n\nYou requested to reset your password for your BS Market account.\n\nClick the link below to reset your password:\n${url}\n\nThis link will expire in 1 hour for security reasons.\n\nIf you didn't request this, please ignore this email.\n\nThanks,\nBS Market Team`,
          });
          console.log("✅ Password reset email sent successfully:", result);
        } catch (error) {
          console.error("❌ Failed to send password reset email:", error);
          throw error; // Re-throw to let Better Auth handle it
        }
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
      sendOnSignUp: false,
      autoSignInAfterVerification: false,
    },
    plugins: [nextCookies()],
  });
};

type AuthInstance = ReturnType<typeof createAuth>;

// Lazy initialization - only create auth when accessed
let authInstance: AuthInstance | null = null;

export const getAuth = (): AuthInstance => {
  if (!authInstance) {
    authInstance = createAuth();
  }
  return authInstance;
};

// Export for backward compatibility
export const auth = getAuth();
