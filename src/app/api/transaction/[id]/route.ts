import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the session cookie
    const sessionCookie = request.cookies.get("better-auth.session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the session in the database
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

    const userId = session.user.id;

    // Try finding as a main Transaction first
    let transaction = await prisma.transaction.findFirst({
      where: {
        id: id,
        userId: userId,
      },
      include: {
        deposit: true,
        withdrawal: true,
      },
    });

    // If not found, try searching by Deposit ID
    if (!transaction) {
      const deposit = await prisma.deposit.findFirst({
        where: {
          id: id,
          userId: userId,
        },
        include: {
          transaction: true,
        },
      });

      if (deposit) {
        // Return structured data for the page
        return NextResponse.json({
          success: true,
          data: {
            id: deposit.id,
            type: "DEPOSIT",
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
            // Add other relevant fields
          },
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
          },
        });
      }
    }

    // If found as main Transaction
    if (transaction) {
      return NextResponse.json({
        success: true,
        data: {
          id: transaction.id,
          type: transaction.type,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          description: transaction.description,
          createdAt: transaction.createdAt,
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
