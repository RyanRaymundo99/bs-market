import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authSession.userId },
      select: {
        documentFront: true,
        documentBack: true,
        documentSelfie: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      documents: {
        documentFront: user.documentFront,
        documentBack: user.documentBack,
        documentSelfie: user.documentSelfie,
      },
    });
  } catch (error) {
    console.error("Error fetching KYC documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch KYC documents" },
      { status: 500 }
    );
  }
}

