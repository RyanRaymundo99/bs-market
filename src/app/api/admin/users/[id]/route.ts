import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const include = searchParams.get("include");

    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle balance request
    if (include === "balance") {
      const balances = await prisma.balance.findMany({
        where: { userId: id },
        select: {
          currency: true,
          amount: true,
          locked: true,
        },
      });
      return NextResponse.json({ success: true, balances });
    }

    // Handle transactions request - fetch from multiple sources
    if (include === "transactions") {
      // Fetch orders (crypto purchases) and withdrawals
      const [orders, withdrawals, deposits] = await Promise.all([
        prisma.order.findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            type: true,
            total: true,
            baseCurrency: true,
            status: true,
            createdAt: true,
            externalOrderId: true,
          },
        }),
        prisma.withdrawal.findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
            createdAt: true,
            externalId: true,
          },
        }),
        prisma.deposit.findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

      // Combine and format transactions
      const transactions = [
        ...orders.map((o) => ({
          id: o.id,
          type: o.type === "BUY" ? "BUY_CRYPTO" : "SELL_CRYPTO",
          amount: Number(o.total),
          currency: o.baseCurrency,
          status: o.status,
          createdAt: o.createdAt,
          externalId: o.externalOrderId,
        })),
        ...withdrawals.map((w) => ({
          id: w.id,
          type: "WITHDRAWAL",
          amount: Number(w.amount),
          currency: w.type || "USDT",
          status: w.status,
          createdAt: w.createdAt,
          externalId: w.externalId,
        })),
        ...deposits.map((d) => ({
          id: d.id,
          type: "DEPOSIT",
          amount: Number(d.amount),
          currency: d.currency,
          status: d.status,
          createdAt: d.createdAt,
          externalId: null,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50);

      return NextResponse.json({ success: true, transactions });
    }

    // First try with explicit select
    let user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        approvalStatus: true,
        kycStatus: true,
        emailVerified: true,
        phoneVerified: true,
        documentFront: true,
        documentBack: true,
        documentSelfie: true,
        kycSubmittedAt: true,
        kycReviewedAt: true,
        kycRejectionReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Manually add dailyDepositLimit from raw query to avoid Prisma client type mismatch
    if (user) {
      try {
        const rawLimit = await prisma.$queryRaw<Array<{ dailyDepositLimit: any }>>`
          SELECT "dailyDepositLimit" FROM "user" WHERE "_id" = ${id}
        `;
        if (rawLimit.length > 0) {
          (user as any).dailyDepositLimit = Number(rawLimit[0].dailyDepositLimit);
        } else {
          (user as any).dailyDepositLimit = 5000;
        }
      } catch (err) {
        console.error("Failed to fetch dailyDepositLimit via raw SQL:", err);
        (user as any).dailyDepositLimit = 5000;
      }
    }

    // If documents are null but kycSubmittedAt exists, try raw query as fallback
    if (
      user &&
      user.kycSubmittedAt &&
      !user.documentFront &&
      !user.documentBack &&
      !user.documentSelfie
    ) {
      console.warn(
        "⚠️ Documents are null but kycSubmittedAt exists - checking raw database..."
      );

      try {
        const rawUser = await prisma.$queryRaw<
          Array<{
            _id: string;
            documentFront: string | null;
            documentBack: string | null;
            documentSelfie: string | null;
          }>
        >`
          SELECT "_id", "documentFront", "documentBack", "documentSelfie"
          FROM "user"
          WHERE "_id" = ${id}
        `;

        if (
          rawUser.length > 0 &&
          (rawUser[0].documentFront ||
            rawUser[0].documentBack ||
            rawUser[0].documentSelfie)
        ) {
          console.log(
            "✅ Found documents in raw query but not in Prisma query!",
            {
              raw: {
                documentFront: rawUser[0].documentFront,
                documentBack: rawUser[0].documentBack,
                documentSelfie: rawUser[0].documentSelfie,
              },
              prisma: {
                documentFront: user.documentFront,
                documentBack: user.documentBack,
                documentSelfie: user.documentSelfie,
              },
            }
          );

          // Use raw data if it has documents
          user = {
            ...user,
            documentFront: rawUser[0].documentFront,
            documentBack: rawUser[0].documentBack,
            documentSelfie: rawUser[0].documentSelfie,
          };
        }
      } catch (rawQueryError) {
        console.error("Raw query failed (non-critical):", rawQueryError);
        // Continue with Prisma result if raw query fails
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Debug: Log document fields to help diagnose missing documents
    console.log("Admin user details API - Document fields:", {
      userId: user.id,
      email: user.email,
      kycSubmittedAt: user.kycSubmittedAt,
      documentFront: user.documentFront,
      documentBack: user.documentBack,
      documentSelfie: user.documentSelfie,
      documentFrontType: typeof user.documentFront,
      documentBackType: typeof user.documentBack,
      documentSelfieType: typeof user.documentSelfie,
      documentFrontLength: user.documentFront?.length,
      documentBackLength: user.documentBack?.length,
      documentSelfieLength: user.documentSelfie?.length,
    });

    // Additional check: Query raw database to see if documents exist but aren't being returned
    // Wrap in try-catch to prevent 500 errors if raw query fails
    try {
      const rawUser = await prisma.$queryRaw<
        Array<{
          _id: string;
          documentFront: string | null;
          documentBack: string | null;
          documentSelfie: string | null;
        }>
      >`
        SELECT "_id", "documentFront", "documentBack", "documentSelfie"
        FROM "user"
        WHERE "_id" = ${id}
      `;

      if (rawUser.length > 0) {
        console.log("Admin user details API - Raw database query:", {
          userId: rawUser[0]._id,
          documentFront: rawUser[0].documentFront,
          documentBack: rawUser[0].documentBack,
          documentSelfie: rawUser[0].documentSelfie,
          matchesPrisma: {
            front: rawUser[0].documentFront === user.documentFront,
            back: rawUser[0].documentBack === user.documentBack,
            selfie: rawUser[0].documentSelfie === user.documentSelfie,
          },
        });

        // If raw query shows documents but Prisma doesn't, use raw data
        if (
          (rawUser[0].documentFront ||
            rawUser[0].documentBack ||
            rawUser[0].documentSelfie) &&
          !user.documentFront &&
          !user.documentBack &&
          !user.documentSelfie
        ) {
          console.warn(
            "⚠️ Documents exist in database but Prisma query returned null!"
          );
          return NextResponse.json({
            success: true,
            user: {
              ...user,
              documentFront: rawUser[0].documentFront,
              documentBack: rawUser[0].documentBack,
              documentSelfie: rawUser[0].documentSelfie,
            },
          });
        }
      }
    } catch (rawQueryError) {
      console.error("Raw database query failed (non-critical):", rawQueryError);
      // Continue with Prisma result if raw query fails
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user details for admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
