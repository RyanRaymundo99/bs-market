import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

// Rate limiting constants
const MAX_LOGIN_ATTEMPTS = 10; // Allow up to 10 wrong password attempts
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_ATTEMPTS_PER_WINDOW = 3; // Max attempts per minute

// In-memory rate limiting (in production, use Redis)
const loginAttempts = new Map<
  string,
  { count: number; lastAttempt: number; lockedUntil?: number }
>();

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0]
    : request.headers.get("x-real-ip") || "unknown";
  return ip;
}

function isRateLimited(identifier: string): {
  limited: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (!attempts) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return { limited: false };
  }

  // Check if account is locked
  if (attempts.lockedUntil && attempts.lockedUntil > now) {
    const retryAfter = Math.ceil((attempts.lockedUntil - now) / 1000);
    return { limited: true, retryAfter };
  }

  // Reset lock if expired
  if (attempts.lockedUntil && attempts.lockedUntil <= now) {
    attempts.lockedUntil = undefined;
    attempts.count = 0;
  }

  // Check rate limit window
  if (now - attempts.lastAttempt < RATE_LIMIT_WINDOW) {
    attempts.count++;
  } else {
    // Reset count if outside window
    attempts.count = 1;
  }

  attempts.lastAttempt = now;

  // Lock account if too many attempts
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = now + LOCKOUT_DURATION;
    const retryAfter = Math.ceil(LOCKOUT_DURATION / 1000);
    return { limited: true, retryAfter };
  }

  // Check rate limit per window
  if (attempts.count > MAX_ATTEMPTS_PER_WINDOW) {
    const retryAfter = Math.ceil(
      (RATE_LIMIT_WINDOW - (now - attempts.lastAttempt)) / 1000
    );
    return { limited: true, retryAfter };
  }

  loginAttempts.set(identifier, attempts);
  return { limited: false };
}

function resetLoginAttempts(identifier: string) {
  loginAttempts.delete(identifier);
}

function recordFailedAttempt(identifier: string) {
  const attempts = loginAttempts.get(identifier) || {
    count: 0,
    lastAttempt: Date.now(),
  };
  attempts.count++;
  attempts.lastAttempt = Date.now();

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
  }

  loginAttempts.set(identifier, attempts);
}

export async function POST(request: NextRequest) {
  try {
    const clientIdentifier = getClientIdentifier(request);

    // Check rate limiting
    const rateLimit = isRateLimited(clientIdentifier);
    if (rateLimit.limited) {
      return NextResponse.json(
        {
          error: rateLimit.retryAfter
            ? `Muitas tentativas de login. Tente novamente em ${Math.ceil(
                rateLimit.retryAfter / 60
              )} minutos.`
            : "Muitas tentativas de login. Por favor, aguarde um momento antes de tentar novamente.",
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // First check if user exists with this email
    const userByEmail = await prisma.user.findFirst({
      where: {
        email: emailLower,
      },
    });

    if (!userByEmail) {
      console.error("Admin login attempt - User not found:", emailLower);
      recordFailedAttempt(clientIdentifier);
      return NextResponse.json(
        {
          error: "Invalid admin credentials",
          hint: "Admin user may not exist. Check /api/auth/check-admin or /api/auth/diagnose-admin",
        },
        { status: 401 }
      );
    }

    // Check if user is the admin user
    if (userByEmail.id !== "admin_001") {
      console.error("Admin login attempt - User is not admin:", {
        email: emailLower,
        userId: userByEmail.id,
      });
      return NextResponse.json(
        {
          error: "Invalid admin credentials",
          hint: `User exists but ID is '${userByEmail.id}' instead of 'admin_001'. Check /api/auth/diagnose-admin for details.`,
        },
        { status: 401 }
      );
    }

    const adminUser = userByEmail;

    // Verify password
    if (!adminUser.password) {
      console.error("Admin login attempt - No password set for admin user");
      return NextResponse.json(
        {
          error:
            "Admin account has no password set. Please reset the password.",
        },
        { status: 401 }
      );
    }

    const isPasswordValid = await compare(password, adminUser.password);
    if (!isPasswordValid) {
      console.error("Admin login attempt - Wrong password for:", emailLower);
      recordFailedAttempt(clientIdentifier);
      const attempts = loginAttempts.get(clientIdentifier);
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - (attempts?.count || 0);

      return NextResponse.json(
        {
          error:
            remainingAttempts > 0
              ? `Senha incorreta. Você tem ${remainingAttempts} tentativa(s) restante(s).`
              : "Muitas tentativas falhadas. Sua conta foi temporariamente bloqueada. Tente novamente em alguns minutos.",
          remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0,
        },
        { status: 401 }
      );
    }

    // Reset failed attempts on successful login
    resetLoginAttempts(clientIdentifier);

    console.log("Admin login successful for:", emailLower);

    // Create admin session
    const sessionId = `admin-session-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    await prisma.session.create({
      data: {
        id: sessionId,
        token: sessionId,
        userId: adminUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Set admin session cookie
    const response = NextResponse.json({
      success: true,
      message: "Admin login successful",
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: "admin",
      },
    });

    console.log("Setting admin session cookie:", sessionId);
    // Use separate cookie for admin so it doesn't conflict with regular user sessions
    response.cookies.set("better-auth.admin-session", sessionId, {
      httpOnly: false, // Changed to false for debugging
      secure: false, // Changed to false for local development
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    console.log("Admin login successful, session created");
    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
