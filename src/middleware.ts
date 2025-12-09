import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Add security headers for all requests
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Check if the request is for admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Skip middleware for admin login page and API routes
    if (
      request.nextUrl.pathname === "/admin/login" ||
      request.nextUrl.pathname.startsWith("/api/")
    ) {
      return response;
    }

    try {
      // Get admin session token from cookies (separate from regular user sessions)
      const sessionToken = request.cookies.get(
        "better-auth.admin-session"
      )?.value;

      if (!sessionToken) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      // Verify session by calling our API endpoint
      const baseUrl = process.env.BETTER_AUTH_URL || request.nextUrl.origin;
      const verifyResponse = await fetch(
        `${baseUrl}/api/auth/verify-admin-session`,
        {
          headers: {
            cookie: `better-auth.admin-session=${sessionToken}`,
          },
        }
      );

      if (!verifyResponse.ok) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      const verifyData = await verifyResponse.json();

      if (!verifyData.valid) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      // User is authenticated admin, allow access
      return response;
    } catch (error) {
      console.error("Middleware error:", error);
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
