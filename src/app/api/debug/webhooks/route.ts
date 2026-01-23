import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized: Admin session required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Fetch webhook events from database
    const webhooks = await prisma.webhookEvent.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        eventType: true,
        source: true,
        transactionId: true,
        externalId: true,
        status: true,
        orderId: true,
        processed: true,
        error: true,
        signatureValid: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        payload: true,
      },
    });

    return NextResponse.json({
      success: true,
      webhooks,
      total: webhooks.length,
    });
  } catch (error) {
    console.error("Error fetching webhook logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
