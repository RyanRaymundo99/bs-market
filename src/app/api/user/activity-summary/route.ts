import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "../../../../../prisma/generated/client";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("better-auth.session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token: sessionCookie.value },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const userId = session.userId;

    const { searchParams } = new URL(request.url);
    const pendingLimit = Math.min(
      100,
      parseInt(searchParams.get("pendingLimit") || "5", 10) || 5
    );
    const notificationLimit = Math.min(
      100,
      parseInt(searchParams.get("notificationLimit") || "5", 10) || 5
    );

    const pendingWhere: Prisma.TransactionWhereInput = {
      userId,
      OR: [
        { order: { status: "PENDING" } },
        { deposit: { status: "PENDING" } },
        {
          withdrawal: {
            status: { in: ["PENDING", "PROCESSING"] },
          },
        },
      ],
    };

    const [pendingCount, recentPending, unreadNotifications, recentNotifications] =
      await Promise.all([
        prisma.transaction.count({ where: pendingWhere }),
        prisma.transaction.findMany({
          where: pendingWhere,
          orderBy: { createdAt: "desc" },
          take: pendingLimit,
          include: {
            order: { select: { status: true } },
            deposit: { select: { status: true } },
            withdrawal: { select: { status: true } },
          },
        }),
        prisma.notification.count({
          where: { userId, read: false },
        }),
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: notificationLimit,
        }),
      ]);

    const recentPendingFormatted = recentPending.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      createdAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      pendingTransactionsCount: pendingCount,
      unreadNotificationCount: unreadNotifications,
      recentPending: recentPendingFormatted,
      recentNotifications: recentNotifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        metadata: n.metadata,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching activity summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity summary" },
      { status: 500 }
    );
  }
}
