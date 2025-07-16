import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasBetterAuthUrl: !!process.env.BETTER_AUTH_URL,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
    nodeEnv: process.env.NODE_ENV,
  });
}
