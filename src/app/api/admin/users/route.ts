import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";

type UserTagRow = { userId: string; tag: string };
type PrismaWithUserTag = typeof prisma & {
  userTag: {
    findMany: (args: { where: { tag?: string; userId?: string | { in: string[] } }; select: { userId?: boolean; tag?: boolean } }) => Promise<UserTagRow[]>;
  };
};

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminSession(request);
    if (!admin.ok) return admin.response;

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
    const where: Record<string, unknown> & { id?: { in: string[] } } = {};
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      where.approvalStatus = status;
    }
    // Tag filter: resolve user IDs that have this tag
    let tagUserIds: string[] | null = null;
    if (tagFilter) {
      const prismaWithTag = prisma as PrismaWithUserTag;
      const withTag = await prismaWithTag.userTag.findMany({
        where: { tag: tagFilter.toUpperCase() },
        select: { userId: true },
      }).catch(() => [] as UserTagRow[]);
      tagUserIds = withTag.map((r) => r.userId);
      if (tagUserIds.length === 0) {
        return NextResponse.json({
          users: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
      where.id = { in: tagUserIds };
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
          documentFront: true,
          documentBack: true,
          documentSelfie: true,
          kycSubmittedAt: true,
          kycReviewedAt: true,
          kycRejectionReason: true,
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
    const tagsByUser: Record<string, string[]> = {};
    if (userIds.length > 0) {
      const prismaWithTag = prisma as PrismaWithUserTag;
      const tagRows = await prismaWithTag.userTag.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, tag: true },
      }).catch(() => [] as UserTagRow[]);
      tagRows.forEach((r) => {
        if (!tagsByUser[r.userId]) tagsByUser[r.userId] = [];
        tagsByUser[r.userId].push(r.tag);
      });
    }

    type UserWithTags = typeof usersRaw[0] & { tags: string[]; riskFlags?: string[]; dailyDepositLimit?: number };
    const users: UserWithTags[] = usersRaw.map((u) => ({
      ...u,
      tags: tagsByUser[u.id] ?? [],
    }));

    // Fetch daily deposit limits for this batch of users via raw SQL
    if (userIds.length > 0) {
      try {
        const rawLimits = await prisma.$queryRawUnsafe<Array<{ _id: string, dailyDepositLimit: number | string | bigint | null }>>(`
          SELECT "_id", "dailyDepositLimit" FROM "user" WHERE "_id" IN (${userIds.map(id => `'${id}'`).join(',')})
        `);
        const limitMap = new Map(rawLimits.map(l => [l._id, Number(l.dailyDepositLimit)]));
        users.forEach(u => {
          u.dailyDepositLimit = limitMap.get(u.id) ?? 5000;
        });
      } catch (err) {
        console.error("Failed to fetch dailyDepositLimit batch via raw SQL:", err);
        // Fallback to default
        users.forEach(u => {
          u.dailyDepositLimit = 5000;
        });
      }
    }

    // Optional risk flags (new account, first withdrawal, large amount)
    if (includeRiskFlags && users.length > 0) {
      const riskUserIds = users.map((u) => u.id);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [withdrawalCounts, maxAmounts] = await Promise.all([
        prisma.withdrawal.groupBy({
          by: ["userId"],
          where: { userId: { in: riskUserIds } },
          _count: true,
        }),
        prisma.transaction.groupBy({
          by: ["userId"],
          where: { userId: { in: riskUserIds }, type: { in: ["DEPOSIT", "WITHDRAWAL", "BUY_CRYPTO", "SELL_CRYPTO"] } },
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
        u.riskFlags = flags;
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
