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
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build where clause for search
    const where: {
      OR?: Array<{
        name?: { contains: string; mode?: "insensitive" };
        email?: { contains: string; mode?: "insensitive" };
        cpf?: { contains: string; mode?: "insensitive" };
      }>;
    } = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { cpf: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch users with notification counts
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        approvalStatus: true,
        kycStatus: true,
        createdAt: true,
        _count: {
          select: {
            notifications: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    // Get unread notification counts for each user
    const usersWithNotificationCounts = await Promise.all(
      users.map(async (user) => {
        const unreadCount = await prisma.notification.count({
          where: {
            userId: user.id,
            read: false,
          },
        });

        const totalCount = user._count.notifications;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          cpf: user.cpf,
          phone: user.phone,
          approvalStatus: user.approvalStatus,
          kycStatus: user.kycStatus,
          createdAt: user.createdAt,
          notificationCount: totalCount,
          unreadNotificationCount: unreadCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      users: usersWithNotificationCounts,
      total: usersWithNotificationCounts.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
