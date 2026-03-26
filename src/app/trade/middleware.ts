import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/trade', '/withdraw', '/profile', '/admin'];

export function middleware(request: NextRequest) {
  // Assuming your session cookie is named 'auth-session' based on your component code
  const sessionCookie = request.cookies.get('auth-session');
  const { pathname } = request.nextUrl;

  // If user is trying to access a protected route without a session, redirect to login
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in and tries to access login/signup, redirect to dashboard
  if ((pathname.startsWith('/login') || pathname.startsWith('/signup')) && sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.svg$|.*\\.png$|.*\\.jpg$|favicon.ico|manifest.json).*)',
  ],
}