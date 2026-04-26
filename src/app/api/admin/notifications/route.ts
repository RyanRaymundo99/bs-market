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

    // Fetch pending users, KYC, deposits and withdrawals
    const [pendingUsers, pendingKYC, pendingDeposits, pendingWithdrawals] = await Promise.all([
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
      prisma.deposit.findMany({
        where: {
          status: "PENDING",
          createdAt: showAll ? undefined : { gt: adminLastSeen },
        },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: showAll ? 50 : 10,
      }),
      prisma.withdrawal.findMany({
        where: {
          status: "PENDING",
          createdAt: showAll ? undefined : { gt: adminLastSeen },
        },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: showAll ? 50 : 10,
      }),
    ]);

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
        title: "Novo Registro de Usuário",
        message: `${user.name} (${user.email}) registrou-se e aguarda aprovação`,
        timestamp: userCreatedAt.toISOString(),
        read: isRead,
        userId: user.id,
      });
    });

    // Add KYC pending notifications
    pendingKYC.forEach((user) => {
      const kycSubmittedAt = user.kycSubmittedAt || user.createdAt || new Date();
      const isRead = kycSubmittedAt <= adminLastSeen;

      notifications.push({
        id: `kyc_${user.id}`,
        type: "kyc_pending",
        title: "Revisão de KYC Necessária",
        message: `${user.name} enviou documentos KYC para revisão`,
        timestamp: kycSubmittedAt.toISOString(),
        read: isRead,
        userId: user.id,
      });
    });

    // Add new deposit notifications
    pendingDeposits.forEach((deposit) => {
      const isRead = deposit.createdAt <= adminLastSeen;

      notifications.push({
        id: `deposit_${deposit.id}`,
        type: "new_deposit",
        title: "Novo Depósito Pendente",
        message: `${deposit.user.name} iniciou um depósito de ${Number(deposit.amount).toFixed(2)} ${deposit.currency}`,
        timestamp: deposit.createdAt.toISOString(),
        read: isRead,
        userId: deposit.userId,
      });
    });

    // Add new withdrawal notifications
    pendingWithdrawals.forEach((withdrawal) => {
      const isRead = withdrawal.createdAt <= adminLastSeen;

      notifications.push({
        id: `withdrawal_${withdrawal.id}`,
        type: "new_withdrawal",
        title: "Nova Solicitação de Saque",
        message: `${withdrawal.user.name} solicitou um saque de ${Number(withdrawal.amount).toFixed(2)} ${withdrawal.currency}`,
        timestamp: withdrawal.createdAt.toISOString(),
        read: isRead,
        userId: withdrawal.userId,
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
