import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authSession.userId;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // Build where clause
    const where: {
      userId: string;
      read?: boolean;
    } = {
      userId: userId,
    };

    if (unreadOnly) {
      where.read = false;
    }

    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: userId,
        read: false,
      },
    });

    return NextResponse.json({
      success: true,
      notifications: notifications,
      unreadCount: unreadCount,
    });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authSession.userId;
    const { notificationId, markAllAsRead } = await request.json();

    if (markAllAsRead) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: userId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
      });
    }

    if (notificationId) {
      // Mark specific notification as read
      await prisma.notification.update({
        where: {
          id: notificationId,
          userId: userId, // Ensure user owns the notification
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Notification marked as read",
      });
    }

    return NextResponse.json(
      { error: "Missing notificationId or markAllAsRead flag" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
