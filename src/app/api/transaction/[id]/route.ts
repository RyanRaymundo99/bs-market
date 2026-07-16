import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";
import type { Prisma } from "../../../../../prisma/generated/client";

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function getAdminMessage(metadata: unknown) {
  return (
    getMetadataString(metadata, "rejectionReason") ||
    getMetadataString(metadata, "refundRejectionReason") ||
    getMetadataString(metadata, "reason") ||
    getMetadataString(metadata, "refundReason")
  );
}

type DepositWithTransaction = Prisma.DepositGetPayload<{
  include: { transaction: true };
}>;

function buildDepositData(deposit: DepositWithTransaction) {
  const metadata = deposit.transaction?.metadata ?? null;
  return {
    id: deposit.id,
    type: "DEPOSIT" as const,
    amount: Number(deposit.amount),
    currency: deposit.currency,
    status: deposit.status,
    createdAt: deposit.createdAt,
    paymentMethod: deposit.paymentMethod,
    pixQrCode: deposit.pixQrCode,
    pixQrCodeBase64: deposit.pixQrCodeBase64,
    externalId: deposit.externalId,
    transactionId: deposit.transactionId,
    proofUrl: deposit.proofUrl,
    adminMessage: getAdminMessage(metadata),
    adminActionAt: getMetadataString(metadata, "rejectedAt"),
    adminActionBy: getMetadataString(metadata, "rejectedBy"),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authSession.user.id;

    // Try finding as a main Transaction first
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: id,
        userId: userId,
      },
      include: {
        deposit: true,
        withdrawal: true,
      },
    });

    // If not found, try searching by Deposit.
    // The purchase history (crypto buy via PIX) links to this page using the
    // Order's externalOrderId / provider payment id, so we must also resolve
    // deposits by externalId and paymentId — not only by the primary key.
    if (!transaction) {
      const deposit = await prisma.deposit.findFirst({
        where: {
          userId: userId,
          OR: [{ id: id }, { externalId: id }, { paymentId: id }],
        },
        include: {
          transaction: true,
        },
      });

      if (deposit) {
        return NextResponse.json({
          success: true,
          data: buildDepositData(deposit),
        });
      }
    }

    // If still not found, try searching by Withdrawal ID
    if (!transaction) {
      const withdrawal = await prisma.withdrawal.findFirst({
        where: {
          id: id,
          userId: userId,
        },
        include: {
          transaction: true,
        },
      });

      if (withdrawal) {
        const metadata = withdrawal.transaction?.metadata ?? null;
        return NextResponse.json({
          success: true,
          data: {
            id: withdrawal.id,
            type: "WITHDRAWAL",
            amount: Number(withdrawal.amount),
            currency: withdrawal.currency,
            status: withdrawal.status,
            createdAt: withdrawal.createdAt,
            paymentMethod: withdrawal.paymentMethod,
            walletAddress: withdrawal.walletAddress,
            network: withdrawal.network,
            pixKey: withdrawal.pixKey,
            hash: withdrawal.hash,
            fee: Number(withdrawal.fee || 0),
            netAmount: Number(withdrawal.netAmount || 0),
            protocol: withdrawal.protocol,
            transactionId: withdrawal.transactionId,
            adminMessage: getAdminMessage(metadata),
            adminActionAt: getMetadataString(metadata, "rejectedAt"),
            adminActionBy: getMetadataString(metadata, "rejectedBy"),
          },
        });
      }
    }

    // If still not found, resolve as an Order (crypto buy). Pending PIX
    // purchases only have an Order + Deposit (no Transaction yet), and the UI
    // links here using the Order id or its externalOrderId.
    if (!transaction) {
      const order = await prisma.order.findFirst({
        where: {
          userId: userId,
          OR: [{ id: id }, { externalOrderId: id }],
        },
        include: {
          transaction: {
            include: { deposit: true, withdrawal: true },
          },
        },
      });

      if (order) {
        // Prefer the related deposit (has PIX QR code + BRL amount).
        const orderExternalId = order.externalOrderId ?? undefined;
        const relatedDeposit = await prisma.deposit.findFirst({
          where: {
            userId: userId,
            OR: [
              ...(order.transactionId
                ? [{ transactionId: order.transactionId }]
                : []),
              ...(orderExternalId
                ? [{ paymentId: orderExternalId }, { externalId: orderExternalId }]
                : []),
            ],
          },
          include: { transaction: true },
        });

        if (relatedDeposit) {
          return NextResponse.json({
            success: true,
            data: buildDepositData(relatedDeposit),
          });
        }

        // Fall back to the order's own data so a real purchase never shows
        // "Transaction not found".
        const metadata = order.transaction?.metadata ?? null;
        return NextResponse.json({
          success: true,
          data: {
            id: order.externalOrderId || order.id,
            type: "BUY_CRYPTO",
            amount: Number(order.amount),
            currency: order.baseCurrency,
            status: order.status,
            createdAt: order.createdAt,
            paymentMethod: "PIX",
            transactionId: order.transactionId,
            adminMessage: getAdminMessage(metadata),
          },
        });
      }
    }

    // If found as main Transaction
    if (transaction) {
      const metadata = transaction.metadata ?? null;
      const relatedStatus =
        transaction.withdrawal?.status ||
        transaction.deposit?.status ||
        transaction.type;

      return NextResponse.json({
        success: true,
        data: {
          id: transaction.id,
          type: transaction.type,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          status: relatedStatus,
          description: transaction.description,
          createdAt: transaction.createdAt,
          paymentMethod:
            transaction.withdrawal?.paymentMethod ||
            transaction.deposit?.paymentMethod ||
            undefined,
          walletAddress: transaction.withdrawal?.walletAddress || undefined,
          network:
            transaction.withdrawal?.network ||
            getMetadataString(metadata, "network") ||
            undefined,
          pixKey: transaction.withdrawal?.pixKey || undefined,
          hash:
            transaction.withdrawal?.hash ||
            getMetadataString(metadata, "transactionHash") ||
            undefined,
          protocol: transaction.withdrawal?.protocol || undefined,
          fee:
            transaction.withdrawal?.fee !== undefined &&
            transaction.withdrawal?.fee !== null
              ? Number(transaction.withdrawal.fee)
              : undefined,
          netAmount:
            transaction.withdrawal?.netAmount !== undefined &&
            transaction.withdrawal?.netAmount !== null
              ? Number(transaction.withdrawal.netAmount)
              : undefined,
          adminMessage: getAdminMessage(metadata),
          adminActionAt: getMetadataString(metadata, "rejectedAt"),
          adminActionBy: getMetadataString(metadata, "rejectedBy"),
          deposit: transaction.deposit ? {
            ...transaction.deposit,
            amount: Number(transaction.deposit.amount),
          } : null,
          withdrawal: transaction.withdrawal ? {
            ...transaction.withdrawal,
            amount: Number(transaction.withdrawal.amount),
            fee: Number(transaction.withdrawal.fee || 0),
            netAmount: Number(transaction.withdrawal.netAmount || 0),
          } : null,
        },
      });
    }

    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
