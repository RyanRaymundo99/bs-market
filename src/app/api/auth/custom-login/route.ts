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
        { error: "Por favor, preencha todos os campos." },
        { status: 400 }
      );
    }

    // First, try to find a user with the custom password field (dev users)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        accounts: true,
      },
    });

    if (!user) {
      recordFailedAttempt(clientIdentifier);
      return NextResponse.json(
        {
          error:
            "Email ou senha incorretos. Verifique suas credenciais e tente novamente.",
        },
        { status: 401 }
      );
    }

    let isValidPassword = false;

    // Check if this is a dev user with custom password
    if (user.password) {
      // This is a dev user with bcrypt password
      try {
        isValidPassword = await compare(password, user.password);
        console.log("Dev user password check:", { isValid: isValidPassword });
      } catch (error) {
        console.error("Error comparing bcrypt password:", error);
        isValidPassword = false;
      }
    } else {
      // This is a better-auth user, check Account table
      const account = user.accounts.find((acc) => acc.password);
      if (account?.password) {
        try {
          isValidPassword = await compare(password, account.password);
          console.log("Better-auth password check:", {
            isValid: isValidPassword,
          });
        } catch (error) {
          console.error("Error comparing better-auth password:", error);
          isValidPassword = false;
        }
      }
    }

    if (!isValidPassword) {
      recordFailedAttempt(clientIdentifier);
      const attempts = loginAttempts.get(clientIdentifier);
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - (attempts?.count || 0);

      return NextResponse.json(
        {
          error:
            remainingAttempts > 0
              ? `Email ou senha incorretos. Você tem ${remainingAttempts} tentativa(s) restante(s).`
              : "Muitas tentativas falhadas. Sua conta foi temporariamente bloqueada. Tente novamente em alguns minutos.",
          remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0,
        },
        { status: 401 }
      );
    }

    // Reset failed attempts on successful login
    resetLoginAttempts(clientIdentifier);

    // Check if user is approved
    if (user.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            user.approvalStatus === "PENDING"
              ? "Sua conta está aguardando aprovação. Por favor, complete seu cadastro e aguarde a aprovação."
              : "Sua conta foi rejeitada. Entre em contato com o suporte para mais informações.",
        },
        { status: 403 }
      );
    }

    // Create a proper better-auth session
    try {
      // Generate a unique session ID
      const sessionId = `dev-session-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Get IP address and user agent for security tracking
      const forwarded = request.headers.get("x-forwarded-for");
      const ipAddress = forwarded
        ? forwarded.split(",")[0]
        : request.headers.get("x-real-ip") || null;
      const userAgent = request.headers.get("user-agent") || null;

      // Create session in the database with security info
      await prisma.session.create({
        data: {
          id: sessionId,
          token: sessionId, // The schema expects a token field
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          ipAddress: ipAddress,
          userAgent: userAgent,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Set the session cookie
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          approvalStatus: user.approvalStatus,
          kycStatus: user.kycStatus,
        },
        message: "Login successful",
        sessionId: sessionId,
      });

      // Set the session cookie with the same name better-auth expects
      response.cookies.set("better-auth.session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: "/",
      });

      console.log(
        "Login successful for user:",
        user.id,
        "Session ID:",
        sessionId
      );
      return response;
    } catch (sessionError) {
      console.error("Error creating session:", sessionError);

      // Fallback to simple response if session creation fails
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          approvalStatus: user.approvalStatus,
          kycStatus: user.kycStatus,
        },
        message: "Login successful (session creation failed)",
        warning: "Session may not persist properly",
      });
    }
  } catch (error) {
    console.error("Custom login error:", error);
    return NextResponse.json(
      {
        error:
          "Ocorreu um erro ao processar seu login. Por favor, tente novamente mais tarde.",
      },
      { status: 500 }
    );
  }
}
