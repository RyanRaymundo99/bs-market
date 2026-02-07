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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const tagFilter = searchParams.get("tag")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    const includeRiskFlags = searchParams.get("includeRiskFlags") === "true";

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      where.approvalStatus = status;
    }
    // Tag filter: resolve user IDs that have this tag
    let tagUserIds: string[] | null = null;
    if (tagFilter) {
      const withTag = await (prisma as any).userTag.findMany({
        where: { tag: tagFilter.toUpperCase() },
        select: { userId: true },
      }).catch(() => []);
      tagUserIds = withTag.map((r: { userId: string }) => r.userId);
      if (tagUserIds.length === 0) {
        return NextResponse.json({
          users: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
      (where as any).id = { in: tagUserIds };
    }
    if (search.length >= 2) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { cpf: { contains: search } },
      ];
    }

    // Fetch users with pagination
    const [usersRaw, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          approvalStatus: true,
          emailVerified: true,
          kycStatus: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const userIds = usersRaw.map((u) => u.id);
    let tagsByUser: Record<string, string[]> = {};
    if (userIds.length > 0) {
      const tagRows = await (prisma as any).userTag.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, tag: true },
      }).catch(() => []);
      tagRows.forEach((r: { userId: string; tag: string }) => {
        if (!tagsByUser[r.userId]) tagsByUser[r.userId] = [];
        tagsByUser[r.userId].push(r.tag);
      });
    }

    const users = usersRaw.map((u) => ({
      ...u,
      tags: tagsByUser[u.id] ?? [],
    }));

    // Optional risk flags (new account, first withdrawal, large amount)
    if (includeRiskFlags && users.length > 0) {
      const userIds = users.map((u) => u.id);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [withdrawalCounts, maxAmounts] = await Promise.all([
        prisma.withdrawal.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds } },
          _count: true,
        }),
        prisma.transaction.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, type: { in: ["DEPOSIT", "WITHDRAWAL", "BUY_CRYPTO", "SELL_CRYPTO"] } },
          _max: { amount: true },
        }),
      ]);
      const withdrawalCountByUser = new Map(withdrawalCounts.map((w) => [w.userId, w._count]));
      const maxAmountByUser = new Map(maxAmounts.map((m) => [m.userId, Number(m._max?.amount ?? 0)]));
      const LARGE_AMOUNT = 10000;
      users.forEach((u) => {
        const flags: string[] = [];
        if (new Date(u.createdAt) > sevenDaysAgo) flags.push("new_account");
        if ((withdrawalCountByUser.get(u.id) ?? 0) === 1) flags.push("first_withdrawal");
        if ((maxAmountByUser.get(u.id) ?? 0) >= LARGE_AMOUNT) flags.push("large_amount");
        (u as any).riskFlags = flags;
      });
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
