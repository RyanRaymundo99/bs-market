import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const showAll = searchParams.get("showAll") === "true";

    // Get current admin user to check their last seen timestamp
    const adminUser = await prisma.user.findUnique({
      where: { id: adminSession.userId },
      select: {
        id: true,
        adminNotificationLastSeenAt: true,
      },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 404 }
      );
    }

    const adminLastSeen = adminUser.adminNotificationLastSeenAt || new Date(0);

    // Build where clauses based on showAll parameter
    const userWhereClause = showAll
      ? { approvalStatus: "PENDING" as const }
      : {
          approvalStatus: "PENDING" as const,
          createdAt: { gt: adminLastSeen },
        };

    const kycWhereClause = showAll
      ? { kycStatus: "PENDING" as const }
      : {
          kycStatus: "PENDING" as const,
          kycSubmittedAt: { gt: adminLastSeen },
        };

    // Fetch pending users and KYC requests
    const [pendingUsers, pendingKYC] = await Promise.all([
      prisma.user.findMany({
        where: userWhereClause,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: showAll ? 50 : 10,
      }),
      prisma.user.findMany({
        where: kycWhereClause,
        select: {
          id: true,
          name: true,
          email: true,
          kycSubmittedAt: true,
          createdAt: true,
        },
        orderBy: { kycSubmittedAt: "desc" },
        take: showAll ? 50 : 10,
      }),
    ]);

    // Debug logging
    console.log("Notifications API Debug:", {
      adminLastSeen: adminLastSeen.toISOString(),
      pendingUsers: pendingUsers.length,
      pendingKYC: pendingKYC.length,
      pendingUserEmails: pendingUsers.map((u) => u.email),
      pendingKYCEmails: pendingKYC.map((u) => u.email),
    });

    // Create notifications from the data
    const notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      timestamp: string;
      read: boolean;
      userId: string;
    }> = [];

    // Add new user notifications
    pendingUsers.forEach((user) => {
      const userCreatedAt = user.createdAt || new Date();
      const isRead = userCreatedAt <= adminLastSeen;

      notifications.push({
        id: `user_${user.id}`,
        type: "new_user",
        title: "New User Registration",
        message: `${user.name} (${user.email}) has registered and is pending approval`,
        timestamp: userCreatedAt.toISOString(),
        read: isRead,
        userId: user.id,
      });
    });

    // Add KYC pending notifications
    pendingKYC.forEach((user) => {
      const kycSubmittedAt =
        user.kycSubmittedAt || user.createdAt || new Date();
      const isRead = kycSubmittedAt <= adminLastSeen;

      notifications.push({
        id: `kyc_${user.id}`,
        type: "kyc_pending",
        title: "KYC Document Review Needed",
        message: `${user.name} has submitted KYC documents for review`,
        timestamp: kycSubmittedAt.toISOString(),
        read: isRead,
        userId: user.id,
      });
    });

    // Sort notifications by timestamp (newest first)
    notifications.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limit the number of notifications
    const limitedNotifications = notifications.slice(0, limit);

    // Count unread notifications
    const unreadCount = limitedNotifications.filter((n) => !n.read).length;

    return NextResponse.json({
      success: true,
      notifications: limitedNotifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
