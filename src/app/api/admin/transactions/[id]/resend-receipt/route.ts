import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import {
  sendPurchaseReceipt,
  sendWithdrawalReceipt,
  sendPIXWithdrawalReceipt,
} from "@/lib/receipt-email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get transaction with all related data
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            phone: true,
          },
        },
        deposit: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            externalId: true,
            paymentMethod: true,
            confirmedAt: true,
            createdAt: true,
          },
        },
        withdrawal: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            hash: true,
            protocol: true,
            pixKey: true,
            walletAddress: true,
            network: true,
            fee: true,
            netAmount: true,
            createdAt: true,
            type: true,
          },
        },
        order: {
          select: {
            id: true,
            type: true,
            baseCurrency: true,
            quoteCurrency: true,
            amount: true,
            price: true,
            total: true,
            status: true,
            externalOrderId: true,
            executedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (!transaction.user.email || !transaction.user.name) {
      return NextResponse.json(
        { error: "User email or name not found" },
        { status: 400 }
      );
    }

    let receiptSent = false;
    let receiptError: string | null = null;

    try {
      // Determine receipt type and send appropriate receipt
      if (transaction.type === "BUY_CRYPTO" && transaction.order) {
        // Purchase receipt
        const totalAmount = Number(transaction.order.total);
        const fee = (totalAmount * 0.03) / 1.03; // 3% fee calculation
        const baseAmount = totalAmount - fee;
        const usdtAmount = Number(transaction.order.amount);

        const result = await sendPurchaseReceipt({
          userName: transaction.user.name,
          userEmail: transaction.user.email,
          amountBRL: baseAmount,
          amountUSDT: usdtAmount,
          exchangeRate: totalAmount / usdtAmount,
          fee: fee,
          totalPaid: totalAmount,
          transactionId:
            transaction.order.externalOrderId || transaction.order.id,
          date: transaction.order.executedAt || transaction.createdAt,
          paymentMethod: "PIX",
        });

        receiptSent = result.success;
        if (!result.success) {
          receiptError = result.message || "Failed to send receipt";
        }
      } else if (transaction.type === "WITHDRAWAL" && transaction.withdrawal) {
        if (transaction.withdrawal.type === "USDT") {
          // USDT withdrawal receipt
          const result = await sendWithdrawalReceipt({
            userName: transaction.user.name,
            userEmail: transaction.user.email,
            amount: Number(transaction.withdrawal.amount),
            networkFee: Number(transaction.withdrawal.fee || 0),
            netAmount: Number(
              transaction.withdrawal.netAmount || transaction.withdrawal.amount
            ),
            network: transaction.withdrawal.network || "UNKNOWN",
            walletAddress: transaction.withdrawal.walletAddress || "",
            transactionHash: transaction.withdrawal.hash || undefined,
            transactionId:
              transaction.withdrawal.protocol ||
              transaction.deposit?.externalId ||
              transaction.id,
            date: transaction.withdrawal.createdAt || transaction.createdAt,
            status: transaction.withdrawal.status || "PENDING",
          });

          receiptSent = result.success;
          if (!result.success) {
            receiptError = result.message || "Failed to send receipt";
          }
        } else if (transaction.withdrawal.type === "PIX") {
          // PIX withdrawal receipt
          const result = await sendPIXWithdrawalReceipt({
            userName: transaction.user.name,
            userEmail: transaction.user.email,
            amount: Number(transaction.withdrawal.amount),
            fee: Number(transaction.withdrawal.fee || 0),
            netAmount: Number(
              transaction.withdrawal.netAmount || transaction.withdrawal.amount
            ),
            pixKey: transaction.withdrawal.pixKey || "",
            protocol: transaction.withdrawal.protocol || transaction.id,
            date: transaction.withdrawal.createdAt || transaction.createdAt,
            status: transaction.withdrawal.status || "PENDING",
          });

          receiptSent = result.success;
          if (!result.success) {
            receiptError = result.message || "Failed to send receipt";
          }
        }
      }

      // Update transaction metadata to track receipt sent
      const metadata = (transaction.metadata as Record<string, unknown>) || {};
      const receiptHistory =
        (metadata.receiptHistory as Array<{
          sentAt: string;
          success: boolean;
          error?: string;
        }>) || [];

      receiptHistory.push({
        sentAt: new Date().toISOString(),
        success: receiptSent,
        ...(receiptError ? { error: receiptError } : {}),
      });

      await prisma.transaction.update({
        where: { id },
        data: {
          metadata: {
            ...metadata,
            receiptHistory,
            lastReceiptSentAt: new Date().toISOString(),
            lastReceiptSuccess: receiptSent,
          },
        },
      });

      if (receiptSent) {
        return NextResponse.json({
          success: true,
          message: "Receipt sent successfully",
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: receiptError || "Failed to send receipt",
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error sending receipt:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to send receipt",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in resend receipt:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
